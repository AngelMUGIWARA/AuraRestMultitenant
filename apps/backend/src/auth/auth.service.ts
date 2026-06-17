import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto, tenantSchemaName: string): Promise<AuthResponseDto> {
    const db = this.tenantPrisma.getClient(tenantSchemaName);

    const user = await db.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo o suspendido');
    }

    // Obtener el slug del tenant a partir del schemaName
    const tenant = await this.prisma.tenant.findUnique({
      where: { schemaName: tenantSchemaName },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as string,
      tenantSlug: tenant?.slug ?? '',
      tenantSchemaName,
    };

    return {
      accessToken: this.jwt.sign(payload),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}

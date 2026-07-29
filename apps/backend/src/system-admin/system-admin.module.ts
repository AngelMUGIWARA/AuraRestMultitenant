import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SystemAdminAuthController } from './auth/system-admin-auth.controller';
import { SystemAdminAuthService } from './auth/system-admin-auth.service';
import { SystemJwtStrategy } from './strategies/system-jwt.strategy';
import { SystemTenantsController } from './tenants/system-tenants.controller';
import { SystemTenantsService } from './tenants/system-tenants.service';
import { SystemTenantsRepository } from './tenants/system-tenants.repository';
import { TenantProvisioningService } from './tenants/tenant-provisioning.service';
import { SystemAuditLogController } from './audit-log/system-audit-log.controller';
import { SystemAuditLogService } from './audit-log/system-audit-log.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('SYSTEM_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('SYSTEM_JWT_EXPIRES_IN', '2h') as any,
        },
      }),
    }),
  ],
  controllers: [SystemAdminAuthController, SystemTenantsController, SystemAuditLogController],
  providers: [
    SystemAdminAuthService,
    SystemJwtStrategy,
    SystemTenantsService,
    SystemTenantsRepository,
    TenantProvisioningService,
    SystemAuditLogService,
  ],
})
export class SystemAdminModule {}

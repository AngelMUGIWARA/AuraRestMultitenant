import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface SystemJwtPayload {
  sub: string;
  email: string;
  role: 'SUPER_ADMIN';
}

@Injectable()
export class SystemJwtStrategy extends PassportStrategy(Strategy, 'system-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SYSTEM_JWT_SECRET'),
    });
  }

  /** El objeto retornado se asigna a request.user */
  validate(payload: SystemJwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

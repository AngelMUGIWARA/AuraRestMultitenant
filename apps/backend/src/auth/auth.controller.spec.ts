import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_REFRESH_THROTTLE_KEY } from '../common/decorators/auth-refresh-throttle.decorator';

function mockAuthService() {
  return {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    setVoiceSeed: jest.fn(),
    voiceLogin: jest.fn(),
  };
}

function buildController(overrides?: Partial<ReturnType<typeof mockAuthService>>) {
  const authService = { ...mockAuthService(), ...overrides };
  const controller = new AuthController(authService as unknown as AuthService);
  return { controller, authService };
}

describe('AuthController', () => {
  describe('change-password', () => {
    it('requiere JWT (usa @CurrentUser)', async () => {
      const { controller, authService } = buildController();
      authService.changePassword.mockResolvedValue({ message: 'Contraseña actualizada exitosamente' });

      const result = await controller.changePassword(
        { id: 'u1', email: 'test@test.com', role: 'OWNER' } as any,
        { schemaName: 'tenant_test' } as any,
        { currentPassword: 'old', newPassword: 'new12345' },
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        'u1',
        'tenant_test',
        'old',
        'new12345',
      );
      expect(result.message).toBe('Contraseña actualizada exitosamente');
    });

    it('no acepta userId del cliente', async () => {
      const { controller, authService } = buildController();
      authService.changePassword.mockResolvedValue({ message: 'OK' });

      await controller.changePassword(
        { id: 'u1', email: 'test@test.com', role: 'OWNER' } as any,
        { schemaName: 'tenant_test' } as any,
        { currentPassword: 'old', newPassword: 'new12345' },
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });

    it('propaga 401 si la contraseña actual es incorrecta', async () => {
      const { controller, authService } = buildController();
      authService.changePassword.mockRejectedValue(
        new UnauthorizedException('La contraseña actual es incorrecta'),
      );

      await expect(
        controller.changePassword(
          { id: 'u1', email: 'test@test.com', role: 'OWNER' } as any,
          { schemaName: 'tenant_test' } as any,
          { currentPassword: 'wrong', newPassword: 'new12345' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propaga 400 si la nueva contraseña es igual a la actual', async () => {
      const { controller, authService } = buildController();
      authService.changePassword.mockRejectedValue(
        new BadRequestException('La nueva contraseña debe ser diferente a la actual'),
      );

      await expect(
        controller.changePassword(
          { id: 'u1', email: 'test@test.com', role: 'OWNER' } as any,
          { schemaName: 'tenant_test' } as any,
          { currentPassword: 'same', newPassword: 'same' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('auth-refresh throttle metadata', () => {
    it('refresh has AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.refresh),
      ).toBe(true);
    });

    it('login does NOT have AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.login),
      ).toBe(false);
    });

    it('logout does NOT have AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.logout),
      ).toBe(false);
    });

    it('changePassword does NOT have AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.changePassword),
      ).toBe(false);
    });

    it('voiceLogin does NOT have AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.voiceLogin),
      ).toBe(false);
    });

    it('setVoiceSeed does NOT have AUTH_REFRESH_THROTTLE_KEY metadata', () => {
      expect(
        Reflect.hasMetadata(AUTH_REFRESH_THROTTLE_KEY, AuthController.prototype.setVoiceSeed),
      ).toBe(false);
    });

    it('refresh also has @Throttle({ auth-refresh: {} }) metadata', () => {
      expect(
        Reflect.hasMetadata('THROTTLER:LIMITauth-refresh', AuthController.prototype.refresh),
      ).toBe(true);
      expect(
        Reflect.hasMetadata('THROTTLER:TTLauth-refresh', AuthController.prototype.refresh),
      ).toBe(true);
    });
  });
});

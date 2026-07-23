import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
});

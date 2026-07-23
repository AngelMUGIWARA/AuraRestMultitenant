import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { InvitationNotifier } from '../notifications/invitation-notifier.interface';
import { DisabledInvitationNotifier } from '../notifications/disabled-invitation-notifier';

function mockRepo() {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    createInvite: jest.fn().mockResolvedValue({
      id: 'u1',
      name: 'Test',
      email: 'test@test.com',
      role: 'WAITER',
      status: 'ACTIVE',
      mustChangePassword: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

function buildService(notifier?: InvitationNotifier) {
  const repo = mockRepo();
  const svc = new UsersService(repo as any, notifier ?? new DisabledInvitationNotifier());
  return { svc, repo };
}

describe('UsersService.invite', () => {
  describe('INVITACIÓN — fail-fast', () => {
    it('assertAvailable falla antes de llamar a randomBytes', async () => {
      const { svc } = buildService();
      const cryptoSpy = jest.spyOn(require('node:crypto'), 'randomBytes');

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(cryptoSpy).not.toHaveBeenCalled();
      cryptoSpy.mockRestore();
    });

    it('assertAvailable falla antes de llamar a bcrypt.hash', async () => {
      const { svc } = buildService();
      const bcrypt = require('bcrypt');
      const hashSpy = jest.spyOn(bcrypt, 'hash');

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(hashSpy).not.toHaveBeenCalled();
      hashSpy.mockRestore();
    });

    it('assertAvailable falla antes de llamar a repository.createInvite', async () => {
      const { svc, repo } = buildService();

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(repo.createInvite).not.toHaveBeenCalled();
    });

    it('no se genera ni loguea contraseña si falla el notifier', async () => {
      const { svc, repo } = buildService();

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(repo.createInvite).not.toHaveBeenCalled();
    });

    it('no se usa Math.random', async () => {
      const mathSpy = jest.spyOn(Math, 'random');
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const { svc } = buildService(notifier);

      await svc.invite('tenant_test', {
        name: 'Test',
        email: 'test@test.com',
        role: 'WAITER',
      });

      expect(mathSpy).not.toHaveBeenCalled();
      mathSpy.mockRestore();
    });

    it('la generación usa randomBytes', async () => {
      const cryptoSpy = jest.spyOn(require('node:crypto'), 'randomBytes');
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const { svc } = buildService(notifier);

      await svc.invite('tenant_test', {
        name: 'Test',
        email: 'test@test.com',
        role: 'WAITER',
      });

      expect(cryptoSpy).toHaveBeenCalledWith(16);
      cryptoSpy.mockRestore();
    });

    it('la contraseña generada tiene al menos 16 caracteres', async () => {
      let capturedPassword = '';
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockImplementation(async (details) => {
          capturedPassword = details.temporaryPassword;
        }),
      };
      const { svc } = buildService(notifier);

      await svc.invite('tenant_test', {
        name: 'Test',
        email: 'test@test.com',
        role: 'WAITER',
      });

      expect(capturedPassword.length).toBeGreaterThanOrEqual(16);
    });

    it('createInvite no devuelve password ni passwordHash', async () => {
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const { svc } = buildService(notifier);

      const result = await svc.invite('tenant_test', {
        name: 'Test',
        email: 'test@test.com',
        role: 'WAITER',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('temporaryPassword');
    });

    it('mustChangePassword se persiste como true cuando existe notifier disponible', async () => {
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const { svc, repo } = buildService(notifier);

      await svc.invite('tenant_test', {
        name: 'Test',
        email: 'test@test.com',
        role: 'WAITER',
      });

      expect(repo.createInvite).toHaveBeenCalledWith(
        'tenant_test',
        expect.objectContaining({
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      );
    });

    it('lanza ConflictException si el email ya existe', async () => {
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockResolvedValue(undefined),
      };
      const repo = mockRepo();
      repo.findByEmail.mockResolvedValue({ id: 'existing' });
      const svc = new UsersService(repo as any, notifier);

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'existing@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('notifier recibe datos correctos del usuario', async () => {
      const sendFn = jest.fn().mockResolvedValue(undefined);
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: sendFn,
      };
      const { svc } = buildService(notifier);

      await svc.invite('tenant_test', {
        name: 'Juan Pérez',
        email: 'juan@test.com',
        role: 'MANAGER',
      });

      expect(sendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Juan Pérez',
          email: 'juan@test.com',
          temporaryPassword: expect.any(String),
        }),
      );
    });

    it('si sendInvitation falla post-persist, elimina el usuario creado', async () => {
      const sendFn = jest.fn().mockRejectedValue(new Error('Email provider down'));
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: sendFn,
      };
      const { svc, repo } = buildService(notifier);

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow('Email provider down');

      expect(repo.createInvite).toHaveBeenCalled();
      expect(repo.remove).toHaveBeenCalledWith('tenant_test', 'u1');
    });

    it('si sendInvitation falla, relanza el error original', async () => {
      const originalError = new Error('SMTP connection timeout');
      const notifier: InvitationNotifier = {
        assertAvailable: jest.fn(),
        sendInvitation: jest.fn().mockRejectedValue(originalError),
      };
      const { svc } = buildService(notifier);

      await expect(
        svc.invite('tenant_test', {
          name: 'Test',
          email: 'test@test.com',
          role: 'WAITER',
        }),
      ).rejects.toThrow('SMTP connection timeout');
    });
  });
});

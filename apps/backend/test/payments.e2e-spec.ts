const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
} from './helpers/test-app.helper';
import {
  mockAdminUser,
  mockCreatedOrder,
  mockPaymentRecord,
  ORDER_ID,
  PAYMENT_ID,
  IDEMPOTENCY_KEY,
} from './helpers/test-data';

describe('Payments (Integration HTTP)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let tenantDb: Record<string, any>;

  beforeAll(async () => {
    const result = await createIntegrationTestApp();
    app = result.app;
    jwtService = result.jwtService;
    tenantDb = result.tenantDb;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tenantDb.user = { findUnique: jest.fn() };
    tenantDb.order = { findUnique: jest.fn(), update: jest.fn() };
    tenantDb.payment = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    };
    tenantDb.tip = { create: jest.fn() };
    tenantDb.restaurantTable = { update: jest.fn() };
    tenantDb.activityLog = { create: jest.fn() };
  });

  function getAdminToken() {
    return generateAccessToken(jwtService, {
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    });
  }

  describe('POST /api/v1/payments/process', () => {
    it('debe procesar un pago exitoso y retornar 201', async () => {
      tenantDb.order.findUnique.mockResolvedValue({
        ...mockCreatedOrder,
        table: { id: 'table-001', branchId: 'branch-001' },
      });
      tenantDb.payment.findMany.mockResolvedValue([]);
      tenantDb.payment.create.mockResolvedValue(mockPaymentRecord);
      tenantDb.order.update.mockResolvedValue({ ...mockCreatedOrder, status: 'PAID' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          orderId: ORDER_ID,
          payments: [{ method: 'CASH', amount: '97.75' }],
        });

      expect(res.status).toBe(201);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('method');
    });

    it('debe retornar el resultado existente con mismo idempotencyKey (idempotency)', async () => {
      const existingPayment = {
        ...mockPaymentRecord,
        idempotencyKey: IDEMPOTENCY_KEY,
        tip: null,
        order: mockCreatedOrder,
      };
      tenantDb.payment.findUnique.mockResolvedValue(existingPayment);

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          orderId: ORDER_ID,
          payments: [{ method: 'CASH', amount: '97.75' }],
          idempotencyKey: IDEMPOTENCY_KEY,
        });

      expect(res.status).toBe(201);
      expect(tenantDb.payment.create).not.toHaveBeenCalled();
      expect(res.body[0].id).toBe(PAYMENT_ID);
    });

    it('debe retornar 400 si el monto excede el saldo pendiente', async () => {
      tenantDb.order.findUnique.mockResolvedValue({
        ...mockCreatedOrder,
        table: { id: 'table-001', branchId: 'branch-001' },
      });
      tenantDb.payment.findMany.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          orderId: ORDER_ID,
          payments: [{ method: 'CASH', amount: '200.00' }],
        });

      expect(res.status).toBe(400);
    });

    it('debe retornar 400 al pagar una orden ya pagada', async () => {
      tenantDb.order.findUnique.mockResolvedValue({
        ...mockCreatedOrder,
        status: 'PAID',
        table: { id: 'table-001', branchId: 'branch-001' },
      });
      tenantDb.payment.findMany.mockResolvedValue([
        { ...mockPaymentRecord, status: 'COMPLETED' },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          orderId: ORDER_ID,
          payments: [{ method: 'CASH', amount: '97.75' }],
        });

      expect(res.status).toBe(400);
    });
  });
});

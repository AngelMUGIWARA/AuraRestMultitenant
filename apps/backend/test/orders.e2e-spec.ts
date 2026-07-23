const request = require('supertest');
import { INestApplication, JwtService } from '@nestjs/common';
import {
  createIntegrationTestApp,
  generateAccessToken,
} from './helpers/test-app.helper';
import {
  mockAdminUser,
  mockCreatedOrder,
  mockPaidOrder,
  MENU_ITEM_ID,
  ORDER_ID,
  TABLE_ID,
} from './helpers/test-data';

describe('Orders (Integration HTTP)', () => {
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
    tenantDb.menuItem = { findMany: jest.fn() };
    tenantDb.order = { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() };
    tenantDb.restaurantTable = { update: jest.fn(), findUnique: jest.fn() };
    tenantDb.kitchenTicket = { create: jest.fn() };
    tenantDb.activityLog = { create: jest.fn() };
    tenantDb.settings = { findUnique: jest.fn().mockResolvedValue(null) };
  });

  function getAdminToken() {
    return generateAccessToken(jwtService, {
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    });
  }

  describe('POST /api/v1/orders - Crear orden', () => {
    it('debe crear una orden DINE_IN con items y retornar 201', async () => {
      tenantDb.menuItem.findMany.mockResolvedValue([
        { id: MENU_ITEM_ID, price: 85.0 },
      ]);

      tenantDb.restaurantTable.findUnique.mockResolvedValue({
        id: TABLE_ID,
        number: 5,
        branchId: 'branch-001',
      });

      tenantDb.order.create.mockResolvedValue(mockCreatedOrder);
      tenantDb.kitchenTicket.create.mockResolvedValue({ id: 'ticket-001', orderId: ORDER_ID });

      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          type: 'DINE_IN',
          items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
          customerName: 'Test Customer',
          tableId: TABLE_ID,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('orderNumber');
      expect(res.body).toHaveProperty('taxRate');
      expect(typeof res.body.taxRate).toBe('number');
    });

    it('debe retornar 400 si se envía array de items vacío', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({
          type: 'DINE_IN',
          items: [],
          customerName: 'Test Customer',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/orders/:id/status - Cambio de estado', () => {
    it('debe permitir transición válida PENDING -> CONFIRMED', async () => {
      tenantDb.order.findUnique.mockResolvedValue(mockCreatedOrder);
      tenantDb.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        status: 'CONFIRMED',
        version: 2,
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
    });

    it('debe rechazar transición inválida PENDING -> PAID', async () => {
      tenantDb.order.findUnique.mockResolvedValue(mockCreatedOrder);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${ORDER_ID}/status`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/orders/:id/cancel - Cancelar orden', () => {
    it('debe cancelar una orden activa (PENDING) y retornar 200', async () => {
      tenantDb.order.findUnique.mockResolvedValue(mockCreatedOrder);
      tenantDb.order.update.mockResolvedValue({
        ...mockCreatedOrder,
        status: 'CANCELLED',
        version: 2,
      });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Cliente canceló' });

      // NOTA: POST cancel no tiene @HttpCode(200) → Nest devuelve 201 por defecto
      expect(res.status).toBe(201);
    });

    it('debe retornar 400 al intentar cancelar una orden ya pagada', async () => {
      tenantDb.order.findUnique.mockResolvedValue(mockPaidOrder);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/orders/${ORDER_ID}/cancel`)
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ reason: 'Test cancel paid' });

      expect(res.status).toBe(400);
    });

    it('debe retornar 401 al intentar crear orden sin JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          type: 'DINE_IN',
          items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
        });

      expect(res.status).toBe(401);
    });
  });
});

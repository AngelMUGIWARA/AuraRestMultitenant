import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { InventoryRepository } from "./inventory.repository";

const SCHEMA = "tenant_test";

const baseItem = {
  id: "item-1",
  name: "Arrachera",
  unit: "KG",
  isActive: true,
  costPerUnit: 220,
  minStock: 10,
  supplierId: "sup-1",
  supplier: { id: "sup-1", name: "Carnes del Norte" },
  stocks: [
    { branchId: "branch-1", quantity: 25 },
    { branchId: "branch-2", quantity: 5 },
  ],
};

describe("InventoryService", () => {
  let service: InventoryService;
  let repo: jest.Mocked<Partial<InventoryRepository>>;

  const owner = { id: "u-owner", role: "OWNER" };
  const admin = { id: "u-admin", role: "ADMIN" };
  const manager = { id: "u-manager", role: "MANAGER" };
  const chef = { id: "u-chef", role: "CHEF" };

  beforeEach(() => {
    repo = {
      findUserBranchIds: jest.fn().mockResolvedValue([]),
      findItems: jest.fn().mockResolvedValue([baseItem]),
      findItemById: jest.fn().mockResolvedValue(baseItem),
      findBranchById: jest.fn().mockResolvedValue({ id: "branch-1" }),
      createMovementWithStock: jest.fn().mockResolvedValue({ movement: {}, stock: {} }),
      findStocks: jest.fn().mockResolvedValue([]),
      findMovements: jest.fn().mockResolvedValue([]),
    };
    service = new InventoryService(repo as unknown as InventoryRepository);
  });

  // ── Permiso fino por tipo de movimiento ──────────────────

  const movementDto = {
    itemId: "item-1",
    branchId: "branch-1",
    quantity: 2,
  };

  it.each([
    ["PURCHASE", manager, true],
    ["PURCHASE", chef, false],
    ["CONSUMPTION", chef, true],
    ["CONSUMPTION", manager, false],
    ["WASTE", chef, true],
    ["WASTE", manager, true],
    ["ADJUSTMENT", chef, false],
    ["ADJUSTMENT", owner, true],
    ["TRANSFER_OUT", manager, false],
    ["TRANSFER_OUT", admin, true],
  ] as const)(
    "movimiento %s con rol %o → permitido=%s",
    async (type, user, allowed) => {
      const attempt = service.createMovement(SCHEMA, user, {
        ...movementDto,
        type,
      } as never);

      if (allowed) {
        await expect(attempt).resolves.toBeDefined();
      } else {
        await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
      }
    },
  );

  it("PURCHASE aplica delta positivo y CONSUMPTION negativo", async () => {
    await service.createMovement(SCHEMA, admin, {
      ...movementDto,
      type: "PURCHASE",
      unitCost: 100,
    } as never);
    expect(repo.createMovementWithStock).toHaveBeenLastCalledWith(
      SCHEMA,
      expect.objectContaining({ stockDelta: 2, totalCost: 200 }),
    );

    await service.createMovement(SCHEMA, chef, {
      ...movementDto,
      type: "CONSUMPTION",
    } as never);
    expect(repo.createMovementWithStock).toHaveBeenLastCalledWith(
      SCHEMA,
      expect.objectContaining({ stockDelta: -2 }),
    );
  });

  it("ADJUSTMENT respeta direction OUT", async () => {
    await service.createMovement(SCHEMA, manager, {
      ...movementDto,
      type: "ADJUSTMENT",
      direction: "OUT",
    } as never);
    expect(repo.createMovementWithStock).toHaveBeenLastCalledWith(
      SCHEMA,
      expect.objectContaining({ stockDelta: -2 }),
    );
  });

  it("rechaza supplierId en movimientos que no son PURCHASE", async () => {
    await expect(
      service.createMovement(SCHEMA, chef, {
        ...movementDto,
        type: "WASTE",
        supplierId: "sup-1",
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("CHEF no puede registrar costos aunque los envíe", async () => {
    await service.createMovement(SCHEMA, chef, {
      ...movementDto,
      type: "CONSUMPTION",
      unitCost: 999,
    } as never);
    expect(repo.createMovementWithStock).toHaveBeenLastCalledWith(
      SCHEMA,
      expect.objectContaining({ unitCost: undefined, totalCost: undefined }),
    );
  });

  // ── Scoping por sucursal ─────────────────────────────────

  it("MANAGER con sucursal asignada no puede operar en otra", async () => {
    (repo.findUserBranchIds as jest.Mock).mockResolvedValue(["branch-2"]);

    await expect(
      service.createMovement(SCHEMA, manager, {
        ...movementDto,
        type: "PURCHASE",
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("OWNER opera en cualquier sucursal sin consultar UserBranch", async () => {
    await service.createMovement(SCHEMA, owner, {
      ...movementDto,
      type: "PURCHASE",
    } as never);
    expect(repo.findUserBranchIds).not.toHaveBeenCalled();
  });

  it("MANAGER solo lista movimientos de sus sucursales", async () => {
    (repo.findUserBranchIds as jest.Mock).mockResolvedValue(["branch-2"]);

    await service.findMovements(SCHEMA, manager, {});
    expect(repo.findMovements).toHaveBeenCalledWith(
      SCHEMA,
      expect.objectContaining({ branchIds: ["branch-2"] }),
    );
  });

  // ── Ocultamiento de costos ───────────────────────────────

  it("CHEF no ve costos ni proveedor en insumos; ADMIN sí", async () => {
    const chefResult = await service.findItems(SCHEMA, chef);
    const chefItem = chefResult.data[0] as Record<string, unknown>;
    expect(chefItem.costPerUnit).toBeUndefined();
    expect(chefItem.supplier).toBeUndefined();
    expect(chefItem.supplierId).toBeUndefined();
    expect(chefItem.name).toBe("Arrachera");

    const adminResult = await service.findItems(SCHEMA, admin);
    const adminItem = adminResult.data[0] as Record<string, unknown>;
    expect(adminItem.costPerUnit).toBe(220);
    expect(adminItem.supplier).toEqual({ id: "sup-1", name: "Carnes del Norte" });
  });
});

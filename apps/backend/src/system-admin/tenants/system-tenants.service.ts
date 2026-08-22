import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PLAN_LIMITS } from '../../common/plan-limits/plan-limits.config';
import { TenantPrismaService } from '../../database/tenant-prisma.service';
import { SystemAuditLogService } from '../audit-log/system-audit-log.service';
import { CreateSystemTenantDto, TenantPlanDto } from './dto/create-system-tenant.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { CreateTenantResponseDto } from './dto/tenant-response.dto';
import { UpdateSystemTenantDto } from './dto/update-system-tenant.dto';
import { SystemTenantsRepository } from './system-tenants.repository';
import { TenantProvisioningService } from './tenant-provisioning.service';

type TenantPlan = TenantPlanDto;

export interface TenantPlanUsage {
  plan: TenantPlan;
  usage: { branches: number; menuItems: number; staff: number };
  limits: { branches: number | null; menuItems: number | null; staff: number | null };
}

@Injectable()
export class SystemTenantsService {
  constructor(
    private readonly repository: SystemTenantsRepository,
    private readonly provisioning: TenantProvisioningService,
    private readonly auditLog: SystemAuditLogService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const tenant = await this.repository.findById(id);
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  async create(dto: CreateSystemTenantDto, superAdminId: string): Promise<CreateTenantResponseDto> {
    const result = await this.provisioning.provisionTenant(dto);

    await this.auditLog.log({
      superAdminId,
      action: 'TENANT_CREATED',
      targetType: 'TENANT',
      targetId: result.tenant.id,
      metadata: { slug: result.tenant.slug, schemaName: result.tenant.schemaName },
    });

    return result;
  }

  async update(id: string, dto: UpdateSystemTenantDto, superAdminId: string) {
    const tenant = await this.findOne(id);

    if (dto.email && dto.email !== tenant.email) {
      const existingEmail = await this.repository.findByEmail(dto.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(`Ya existe un tenant registrado con el correo "${dto.email}"`);
      }
    }

    const updated = await this.repository.update(id, dto);

    await this.auditLog.log({
      superAdminId,
      action: 'TENANT_UPDATED',
      targetType: 'TENANT',
      targetId: id,
      metadata: { fields: Object.keys(dto) },
    });

    return updated;
  }

  async updatePlan(id: string, plan: TenantPlan, superAdminId: string) {
    const tenant = await this.findOne(id);
    const currentPlan = tenant.plan as TenantPlan;
    if (currentPlan === plan) return tenant;

    const planUsage = await this.getPlanUsage(id);
    const nextLimits = PLAN_LIMITS[plan];
    const exceeded = ([
      ['sucursales', planUsage.usage.branches, nextLimits.maxBranches],
      ['platillos del menú', planUsage.usage.menuItems, nextLimits.maxMenuItems],
      ['usuarios de staff', planUsage.usage.staff, nextLimits.maxStaff],
    ] as [string, number, number | null][]).find(
      ([, usage, limit]) => limit !== null && usage > limit,
    );

    if (exceeded) {
      throw new BadRequestException(
        `No se puede cambiar a ${plan}: el tenant excede el límite de ${exceeded[0]} del plan (${exceeded[1]}/${exceeded[2]}).`,
      );
    }

    const updated = await this.repository.updatePlan(id, plan);
    await this.auditLog.log({
      superAdminId,
      action: 'TENANT_PLAN_CHANGED',
      targetType: 'TENANT',
      targetId: id,
      metadata: { previousPlan: currentPlan, nextPlan: plan },
    });
    return updated;
  }

  async getPlanUsage(id: string): Promise<TenantPlanUsage> {
    const tenant = await this.findOne(id);
    const db = this.tenantPrisma.getClient(tenant.schemaName);
    const [branches, menuItems, staff] = await Promise.all([
      db.branch.count(),
      db.menuItem.count(),
      db.user.count({ where: { role: { in: ['MANAGER', 'WAITER', 'CASHIER', 'KITCHEN_STAFF'] } } }),
    ]);
    const plan = tenant.plan as TenantPlan;
    const planLimits = PLAN_LIMITS[plan];
    return {
      plan,
      usage: { branches, menuItems, staff },
      limits: {
        branches: planLimits.maxBranches,
        menuItems: planLimits.maxMenuItems,
        staff: planLimits.maxStaff,
      },
    };
  }

  async suspend(id: string, dto: SuspendTenantDto, superAdminId: string) {
    await this.findOne(id);
    const tenant = await this.repository.updateStatus(id, 'SUSPENDED');

    await this.auditLog.log({
      superAdminId,
      action: 'TENANT_SUSPENDED',
      targetType: 'TENANT',
      targetId: id,
      metadata: { reason: dto.reason },
    });

    return tenant;
  }

  async activate(id: string, superAdminId: string) {
    await this.findOne(id);
    const tenant = await this.repository.updateStatus(id, 'ACTIVE');

    await this.auditLog.log({
      superAdminId,
      action: 'TENANT_ACTIVATED',
      targetType: 'TENANT',
      targetId: id,
    });

    return tenant;
  }

  async resetOwnerPassword(id: string, superAdminId: string) {
    const result = await this.provisioning.resetOwnerPassword(id);

    await this.auditLog.log({
      superAdminId,
      action: 'OWNER_PASSWORD_RESET',
      targetType: 'TENANT',
      targetId: id,
      metadata: { ownerEmail: result.email },
    });

    return result;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemTenantsRepository } from './system-tenants.repository';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { SystemAuditLogService } from '../audit-log/system-audit-log.service';
import { CreateSystemTenantDto } from './dto/create-system-tenant.dto';
import { UpdateSystemTenantDto } from './dto/update-system-tenant.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { CreateTenantResponseDto } from './dto/tenant-response.dto';

@Injectable()
export class SystemTenantsService {
  constructor(
    private readonly repository: SystemTenantsRepository,
    private readonly provisioning: TenantProvisioningService,
    private readonly auditLog: SystemAuditLogService,
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

  async update(id: string, dto: UpdateSystemTenantDto) {
    await this.findOne(id);
    return this.repository.update(id, dto);
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

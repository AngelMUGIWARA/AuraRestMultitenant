import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedSystemAdmin, CurrentSystemAdmin } from '../decorators/current-system-admin.decorator';
import { SystemJwtAuthGuard } from '../guards/system-jwt-auth.guard';
import { CreateSystemTenantDto } from './dto/create-system-tenant.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { CreateTenantResponseDto, OwnerCredentialsDto, TenantResponseDto } from './dto/tenant-response.dto';
import { UpdateSystemTenantDto, UpdateTenantPlanDto } from './dto/update-system-tenant.dto';
import { SystemTenantsService } from './system-tenants.service';

@ApiTags('System Admin — Tenants')
@ApiBearerAuth('SystemJWT')
@Public()
@UseGuards(SystemJwtAuthGuard)
@Controller('system-admin/tenants')
export class SystemTenantsController {
  constructor(private readonly service: SystemTenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los tenants de la plataforma (solo Super Admin)', operationId: 'systemAdmin_findAllTenants' })
  @ApiResponse({ status: 200, type: [TenantResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tenant por id (solo Super Admin)', operationId: 'systemAdmin_findOneTenant' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear un tenant nuevo — aprovisiona el schema, corre las migraciones y siembra el usuario OWNER (solo Super Admin)',
    operationId: 'systemAdmin_createTenant',
  })
  @ApiResponse({ status: 201, type: CreateTenantResponseDto })
  @ApiResponse({ status: 409, description: 'El slug ya está en uso' })
  create(@Body() dto: CreateSystemTenantDto, @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin) {
    return this.service.create(dto, admin.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de un tenant existente (solo Super Admin)', operationId: 'systemAdmin_updateTenant' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  @ApiResponse({ status: 409, description: 'El correo ya está en uso por otro tenant' })
  update(@Param('id') id: string, @Body() dto: UpdateSystemTenantDto, @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin) {
    return this.service.update(id, dto, admin.id);
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Cambiar el plan de un tenant (solo Super Admin)', operationId: 'systemAdmin_changeTenantPlan' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  changePlan(
    @Param('id') id: string,
    @Body() dto: UpdateTenantPlanDto,
    @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin,
  ) {
    return this.service.updatePlan(id, dto.plan, admin.id);
  }

  @Get(':id/plan-usage')
  @ApiOperation({ summary: 'Consultar uso y límites del plan de un tenant (solo Super Admin)', operationId: 'systemAdmin_getTenantPlanUsage' })
  getPlanUsage(@Param('id') id: string) {
    return this.service.getPlanUsage(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspender un tenant (solo Super Admin)', operationId: 'systemAdmin_suspendTenant' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendTenantDto,
    @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin,
  ) {
    return this.service.suspend(id, dto, admin.id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un tenant suspendido (solo Super Admin)', operationId: 'systemAdmin_activateTenant' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  activate(@Param('id') id: string, @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin) {
    return this.service.activate(id, admin.id);
  }

  @Patch(':id/reset-owner-password')
  @ApiOperation({
    summary:
      'Genera una contraseña temporal nueva para el OWNER del tenant (no recupera la anterior, esa nunca se guarda en texto plano) — solo Super Admin',
    operationId: 'systemAdmin_resetOwnerPassword',
  })
  @ApiResponse({ status: 200, type: OwnerCredentialsDto })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado o sin usuario OWNER' })
  resetOwnerPassword(@Param('id') id: string, @CurrentSystemAdmin() admin: AuthenticatedSystemAdmin) {
    return this.service.resetOwnerPassword(id, admin.id);
  }
}

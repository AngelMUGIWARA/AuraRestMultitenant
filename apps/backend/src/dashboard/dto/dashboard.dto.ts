import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// Los DTOs replican los contratos DashboardStats / RevenueDataPoint /
// ActivityItem de @maison/types que consume dashboard-mf.

export class DashboardStatsDto {
  @ApiProperty({ description: 'Sucursales registradas del tenant' })
  totalTenants: number;

  @ApiProperty() activeTenants: number;
  @ApiProperty() totalUsers: number;
  @ApiProperty() activeUsers: number;

  @ApiProperty({ description: 'Ingresos (órdenes PAID) del mes en curso' })
  monthlyRevenue: number;

  @ApiProperty({ description: '% de variación contra el mes anterior' })
  revenueGrowth: number;

  @ApiProperty({ description: 'Siempre 0: aún no hay modelo de calificaciones' })
  avgRating: number;

  @ApiProperty() newTenantsThisMonth: number;

  @ApiProperty({ enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] })
  plan: string;

  @ApiProperty()
  planUsage: {
    usage: { branches: number; menuItems: number; staff: number };
    limits: { branches: number | null; menuItems: number | null; staff: number | null };
  };
}

export class RevenueQueryDto {
  @ApiPropertyOptional({ enum: ['monthly'], default: 'monthly' })
  @IsOptional()
  @IsIn(['monthly'])
  period?: string = 'monthly';
}

export class RevenuePointDto {
  @ApiProperty({ example: 'ene' }) month: string;
  @ApiProperty() revenue: number;
  @ApiProperty({ description: 'Sucursales activas al cierre de ese mes' })
  tenants: number;
}

export class ActivityQueryDto {
  @ApiPropertyOptional({ default: 8, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 8;
}

export class ActivityItemDto {
  @ApiProperty() id: string;
  @ApiProperty({
    enum: [
      'tenant_created',
      'user_registered',
      'plan_upgraded',
      'payment_received',
      'tenant_suspended',
      'menu_published',
    ],
  })
  type: string;

  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() timestamp: string;
  @ApiProperty() actorId: string;
  @ApiProperty() actorName: string;
}

export class BranchesSummaryQueryDto {
  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}

export class BranchSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() ownerEmail: string;

  @ApiProperty({ enum: ['active', 'inactive', 'suspended', 'trial'] })
  status: string;

  @ApiProperty({
    enum: ['starter', 'professional', 'enterprise'],
    description: 'Derivado del plan del tenant (todas las sucursales lo comparten)',
  })
  plan: string;

  @ApiProperty() monthlyRevenue: number;
  @ApiProperty() monthlyOrders: number;

  @ApiProperty({ description: 'Siempre 0: aún no hay modelo de calificaciones' })
  avgRating: number;
}

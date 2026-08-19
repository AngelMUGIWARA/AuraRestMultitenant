import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantPlanDto } from './create-system-tenant.dto';

export class UpdateSystemTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ enum: TenantPlanDto })
  @IsOptional()
  @IsEnum(TenantPlanDto)
  plan?: TenantPlanDto;
}

export class UpdateTenantPlanDto {
  @ApiProperty({ enum: TenantPlanDto })
  @IsDefined()
  @IsEnum(TenantPlanDto)
  plan: TenantPlanDto;
}

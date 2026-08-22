import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TenantPlanDto } from './create-system-tenant.dto';

export class UpdateSystemTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'El correo del restaurante no es válido' })
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La dirección no puede superar los 255 caracteres' })
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La URL del logo no puede superar los 500 caracteres' })
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

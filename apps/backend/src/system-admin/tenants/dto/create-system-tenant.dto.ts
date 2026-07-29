import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export enum TenantPlanDto {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateSystemTenantDto {
  @ApiProperty({ example: 'Restaurante Demo 2' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'restaurante-demo-2', description: 'Slug único; el schemaName de Postgres se deriva de este valor.' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser minúsculas, números y guiones (ej. mi-restaurante)',
  })
  slug: string;

  @ApiProperty({ example: 'contacto@restaurante2.com' })
  @IsEmail()
  email: string;

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

  @ApiPropertyOptional({ enum: TenantPlanDto, default: TenantPlanDto.FREE })
  @IsOptional()
  @IsEnum(TenantPlanDto)
  plan?: TenantPlanDto;

  @ApiProperty({ example: 'Carlos Dueño', description: 'Nombre del primer usuario OWNER que se crea automáticamente.' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'owner@restaurante2.com', description: 'Email del primer usuario OWNER que se crea automáticamente.' })
  @IsEmail()
  ownerEmail: string;
}

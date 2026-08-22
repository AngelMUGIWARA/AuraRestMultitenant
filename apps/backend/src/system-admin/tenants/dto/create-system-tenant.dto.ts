import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export enum TenantPlanDto {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export class CreateSystemTenantDto {
  @ApiProperty({ example: 'Restaurante Demo 2' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'restaurante-demo-2', description: 'Slug único; el schemaName de Postgres se deriva de este valor.' })
  @IsString()
  @MaxLength(60, { message: 'El slug no puede superar los 60 caracteres' })
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser minúsculas, números y guiones (ej. mi-restaurante)',
  })
  slug: string;

  @ApiProperty({ example: 'contacto@restaurante2.com' })
  @IsEmail({}, { message: 'El correo del restaurante no es válido' })
  @MaxLength(150, { message: 'El correo no puede superar los 150 caracteres' })
  email: string;

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

  @ApiPropertyOptional({ enum: TenantPlanDto, default: TenantPlanDto.FREE })
  @IsOptional()
  @IsEnum(TenantPlanDto)
  plan?: TenantPlanDto;

  @ApiProperty({ example: 'Carlos Dueño', description: 'Nombre del primer usuario OWNER que se crea automáticamente.' })
  @IsString()
  @MinLength(2, { message: 'El nombre del OWNER debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre del OWNER no puede superar los 100 caracteres' })
  ownerName: string;

  @ApiProperty({ example: 'owner@restaurante2.com', description: 'Email del primer usuario OWNER que se crea automáticamente.' })
  @IsEmail({}, { message: 'El correo del OWNER no es válido' })
  @MaxLength(150, { message: 'El correo del OWNER no puede superar los 150 caracteres' })
  ownerEmail: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() schemaName: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() address?: string | null;
  @ApiPropertyOptional() logoUrl?: string | null;
  @ApiProperty() status: string;
  @ApiProperty() plan: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class OwnerCredentialsDto {
  @ApiProperty() email: string;
  @ApiProperty() temporaryPassword: string;
}

export class CreateTenantResponseDto {
  @ApiProperty({ type: TenantResponseDto })
  tenant: TenantResponseDto;

  @ApiProperty({
    type: OwnerCredentialsDto,
    description:
      'Credenciales del usuario OWNER recién aprovisionado. Se devuelven una sola vez — no se puede recuperar la contraseña después.',
  })
  owner: OwnerCredentialsDto;
}

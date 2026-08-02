import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  KITCHEN_STAFF = 'KITCHEN_STAFF',
}

export class InviteUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@restaurante.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Sucursal (branch) a la que se asignará el usuario',
    type: String,
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}

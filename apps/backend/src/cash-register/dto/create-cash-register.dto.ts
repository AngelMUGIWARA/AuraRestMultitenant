import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum CashRegisterStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateCashRegisterDto {
  @ApiProperty({
    description: 'ID de la sucursal',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @ApiProperty({
    description: 'Nombre de la caja',
    example: 'Caja Principal',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    enum: CashRegisterStatusDto,
    default: CashRegisterStatusDto.ACTIVE,
    description: 'Estado de la caja',
  })
  @IsEnum(CashRegisterStatusDto)
  @IsNotEmpty()
  status!: CashRegisterStatusDto;
}

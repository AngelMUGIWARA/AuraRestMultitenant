import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export enum CashMovementTypeDto {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreateCashMovementDto {
  @ApiProperty({
    enum: CashMovementTypeDto,
    description: 'Tipo de movimiento',
  })
  @IsEnum(CashMovementTypeDto)
  @IsNotEmpty()
  type!: CashMovementTypeDto;

  @ApiProperty({
    description: 'Monto del movimiento (siempre positivo)',
    example: 500.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Motivo del movimiento',
    example: 'Ingreso por cambio de proveedor',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({
    description: 'Versión actual de la sesión (optimistic locking)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  version!: number;
}

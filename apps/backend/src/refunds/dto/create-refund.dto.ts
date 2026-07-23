import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefundDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsNumber()
  @IsNotEmpty()
  expectedVersion: number;
}

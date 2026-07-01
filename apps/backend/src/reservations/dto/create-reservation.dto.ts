import { IsString, IsNotEmpty, IsInt, IsDateString, IsOptional, Min, IsEmail } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsString()
  @IsNotEmpty()
  guestPhone: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsInt()
  @Min(1)
  partySize: number;

  @IsDateString()
  @IsNotEmpty()
  date: string; // formato YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  time: string; // formato HH:MM

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  tableId: string;
  
}
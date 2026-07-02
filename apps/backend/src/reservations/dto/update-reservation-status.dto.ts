import { IsString, IsNotEmpty, IsIn, IsEnum } from 'class-validator';
import { ReservationStatus } from '../../generated/prisma-tenant';

export class UpdateReservationStatusDto {
    @IsEnum(ReservationStatus) // Valida automáticamente contra los valores del Enum
    @IsNotEmpty()
    status: ReservationStatus; // Cambia string por el tipo del Enum
}

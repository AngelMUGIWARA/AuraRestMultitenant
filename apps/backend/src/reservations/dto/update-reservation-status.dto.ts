import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { ReservationStatus } from '../../generated/prisma-tenant';

export class UpdateReservationStatusDto {
    @ApiProperty({ enum: ReservationStatus, description: 'Nuevo estado de la reservación' })
    @IsEnum(ReservationStatus)
    @IsNotEmpty()
    status: ReservationStatus;
}

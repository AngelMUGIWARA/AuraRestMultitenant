import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReservationResponseDto {
    @ApiProperty()
    id: string;
    @ApiProperty()
    guestName: string;
    @ApiProperty()
    guestPhone: string;
    @ApiPropertyOptional()
    guestEmail?: string | null;
    @ApiProperty()
    date: string;
    @ApiProperty()
    time: string;
    @ApiProperty()
    partySize: number;
    @ApiProperty()
    status: string;
    @ApiProperty()
    branchId: string;
    @ApiProperty()
    tableId: string;
    @ApiPropertyOptional()
    notes?: string | null;
    @ApiProperty()
    createdAt: Date;
  }
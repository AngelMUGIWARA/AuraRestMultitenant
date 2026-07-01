export class ReservationResponseDto {
    id: string;
    guestName: string;
    date: string;
    time: string;
    partySize: number;
    status: string;
    branchId: string;
    createdAt: Date;
  }
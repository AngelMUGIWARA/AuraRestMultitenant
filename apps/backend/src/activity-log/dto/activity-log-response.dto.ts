import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entity: string;

  @ApiProperty()
  entityId: string;

  @ApiPropertyOptional()
  changes?: string;

  @ApiProperty()
  createdAt: string;
}

export class PaginatedActivityLogResponseDto {
  @ApiProperty({ type: [ActivityLogResponseDto] })
  data: ActivityLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

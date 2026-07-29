import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty() role: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class UserStatsDto {
  @ApiProperty() totalUsers: number;
  @ApiProperty() activeUsers: number;
  @ApiProperty() inactiveUsers: number;

  @ApiProperty({
    description:
      'Usuarios invitados que aún no establecen su propia contraseña (mustChangePassword = true)',
  })
  pendingUsers: number;

  @ApiProperty({ description: 'Roles OWNER + ADMIN' })
  adminCount: number;

  @ApiProperty({ description: 'Rol MANAGER' })
  managerCount: number;

  @ApiProperty({ description: 'Roles WAITER, CASHIER, CHEF y KITCHEN_STAFF' })
  staffCount: number;

  @ApiProperty({ description: 'Usuarios creados desde el inicio del mes actual' })
  newThisMonth: number;
}

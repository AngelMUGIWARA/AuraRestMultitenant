import { ApiProperty } from '@nestjs/swagger';

export class SystemAdminAuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  superAdmin: {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN';
  };
}

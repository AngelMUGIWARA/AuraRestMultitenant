import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SystemAdminRefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

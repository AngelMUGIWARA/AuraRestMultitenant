import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SystemAdminLoginDto {
  @ApiProperty({ example: 'superadmin@aurarest.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SuperAdmin123' })
  @IsString()
  @MinLength(6)
  password: string;
}

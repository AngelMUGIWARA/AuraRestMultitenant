import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PublicMenuQueryDto {
  @ApiPropertyOptional({
    description: 'Branch slug o ID (usa slug si no está seguro)',
  })
  @IsOptional()
  @IsString()
  branch?: string;
}

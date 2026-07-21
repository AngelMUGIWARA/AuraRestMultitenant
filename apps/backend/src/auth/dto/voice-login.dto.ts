import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VoiceLoginDto {
  @ApiProperty({ example: 'ana' })
  @IsString()
  @MinLength(1)
  voiceUsername: string;

  @ApiProperty({ example: 'manzana azul siete' })
  @IsString()
  @MinLength(1)
  seedWord: string;
}

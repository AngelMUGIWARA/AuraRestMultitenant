import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class VoiceSeedDto {
  @ApiProperty({
    example: 'ana',
    description: 'Nombre corto, fácil de decir en voz alta (no el email)',
  })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'voiceUsername solo puede contener letras, números, guiones y guiones bajos',
  })
  voiceUsername: string;

  @ApiProperty({ example: 'manzana azul siete' })
  @IsString()
  @MinLength(4)
  seedWord: string;
}

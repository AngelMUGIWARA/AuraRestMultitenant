import { ApiProperty } from '@nestjs/swagger';

export class VoiceSeedGenerateResponseDto {
  @ApiProperty({
    example: 'manzana azul girasol',
    description:
      'Palabra clave generada, en texto plano. Solo se muestra en esta respuesta — no se puede volver a recuperar después.',
  })
  seedWord: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class VoiceLoginResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  role?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representa la entidad User tal como vive en el schema del tenant */
export class UserEntity {
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

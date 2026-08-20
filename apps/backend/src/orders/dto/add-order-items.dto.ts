import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested, ArrayMinSize } from 'class-validator';

class AddOrderItemDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  menuItemId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ required: false, example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddOrderItemsDto {
  @ApiProperty({ type: [AddOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddOrderItemDto)
  items: AddOrderItemDto[];
}

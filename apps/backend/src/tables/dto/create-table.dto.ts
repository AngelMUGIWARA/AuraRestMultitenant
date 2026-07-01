import { IsString, IsInt, IsOptional, IsNotEmpty, Min, IsBoolean } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @IsNotEmpty()
  number: number; // Número de la mesa

  @IsString()
  @IsOptional()
  name?: string;  // Opcional, ej: "Mesa junto a la ventana"

  @IsInt()
  @Min(1)
  capacity: number; // Capacidad mínima de 1 persona

  @IsString()
  @IsNotEmpty()
  branchId: string; // Esencial para el Multitenancy

  @IsString()
  @IsOptional()
  locationZone?: string; // Ej: "Terraza", "Interior"
}
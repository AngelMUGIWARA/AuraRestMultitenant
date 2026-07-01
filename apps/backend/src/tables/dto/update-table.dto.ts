import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto';
import { IsBoolean, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { TableStatus } from '../../generated/prisma-tenant';

export class UpdateTableDto extends PartialType(CreateTableDto) {
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsNotEmpty()
    @IsEnum(TableStatus)
    status?: TableStatus;
}

export class UpdateTableStatusDto {
    @IsEnum(TableStatus)
    @IsNotEmpty()
    status: TableStatus;
}


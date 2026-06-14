import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedUsersDto, UserResponseDto } from './dto/user-response.dto';

/**
 * Capa de lógica de negocio para Users.
 * Nunca accede a la BD directamente — siempre delega al Repository.
 */
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findAll(
    schemaName: string,
    pagination: PaginationDto,
  ): Promise<PaginatedUsersDto> {
    const { page = 1, limit = 20 } = pagination;
    const { data, total } = await this.repo.findAll(schemaName, {
      skip: pagination.skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(schemaName: string, id: string): Promise<UserResponseDto> {
    const user = await this.repo.findById(schemaName, id);
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(
    schemaName: string,
    dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const existing = await this.repo.findByEmail(schemaName, dto.email);
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }
    return this.repo.create(schemaName, dto);
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    await this.findOne(schemaName, id); // lanza 404 si no existe
    return this.repo.update(schemaName, id, dto);
  }

  async remove(schemaName: string, id: string): Promise<void> {
    await this.findOne(schemaName, id);
    await this.repo.remove(schemaName, id);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { MenusRepository, MenuFilters } from './menus.repository';

import { UploadService } from '../upload/upload.service';

import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class MenusService {
  constructor(
    private readonly repo: MenusRepository,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(
    schemaName: string,
    categoryId?: string,
    filters?: MenuFilters,
  ) {
    const items = await this.repo.findAll(schemaName, categoryId, filters);
    return {
      data: items,
      total: items.length,
      page: 1,
      limit: items.length || 20,
      totalPages: 1,
    };
  }

  async findOne(schemaName: string, id: string) {
    const item = await this.repo.findById(schemaName, id);

    if (!item) {
      throw new NotFoundException(`Menu item ${id} no encontrado`);
    }

    return item;
  }

  async create(
    schemaName: string,
    dto: CreateMenuDto,
    file?: Express.Multer.File,
  ) {
    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      const image = await this.uploadService.uploadImage(file, 'menu-items');

      dto.imageUrl = image.secure_url;
    }

    return this.repo.create(schemaName, dto);
  }

  async update(
    schemaName: string,
    id: string,
    dto: UpdateMenuDto,
    file?: Express.Multer.File,
  ) {
    const item = await this.findOne(schemaName, id);

    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      await this.uploadService.deleteImageByUrl(item.imageUrl);

      const image = await this.uploadService.uploadImage(file, 'menu-items');

      dto.imageUrl = image.secure_url;
    }

    return this.repo.update(schemaName, id, dto);
  }

  async updatePrice(schemaName: string, id: string, dto: UpdatePriceDto) {
    await this.findOne(schemaName, id);

    return this.repo.updatePrice(schemaName, id, dto.price);
  }

  async updateStatus(schemaName: string, id: string, dto: UpdateStatusDto) {
    await this.findOne(schemaName, id);

    return this.repo.updateStatus(schemaName, id, dto.status);
  }

  async getStats(schemaName: string) {
    return this.repo.getStats(schemaName);
  }

  async remove(schemaName: string, id: string) {
    const item = await this.findOne(schemaName, id);

    await this.uploadService.deleteImageByUrl(item.imageUrl);

    return this.repo.remove(schemaName, id);
  }
}

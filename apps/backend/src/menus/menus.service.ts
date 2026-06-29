import { Injectable, NotFoundException } from "@nestjs/common";

import { MenusRepository } from "./menus.repository";

import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { UpdatePriceDto } from "./dto/update-price.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

@Injectable()
export class MenusService {
  constructor(private readonly repo: MenusRepository) {}

  async findAll(schemaName: string) {
    return this.repo.findAll(schemaName);
  }

  async findOne(schemaName: string, id: string) {
    const item = await this.repo.findById(schemaName, id);

    if (!item) {
      throw new NotFoundException(`Menu item ${id} no encontrado`);
    }

    return item;
  }

  async create(schemaName: string, dto: CreateMenuDto) {
    return this.repo.create(schemaName, dto);
  }

  async update(schemaName: string, id: string, dto: UpdateMenuDto) {
    await this.findOne(schemaName, id);

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
    await this.findOne(schemaName, id);

    await this.repo.remove(schemaName, id);
  }
}

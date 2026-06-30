import { Injectable, NotFoundException } from "@nestjs/common";

import { CategoriesRepository } from "./categories.repository";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async findAll(schemaName: string) {
    return this.repo.findAll(schemaName);
  }

  async findOne(schemaName: string, id: string) {
    const category = await this.repo.findById(schemaName, id);

    if (!category) {
      throw new NotFoundException(`Category ${id} no encontrada`);
    }

    return category;
  }

  async create(schemaName: string, dto: CreateCategoryDto) {
    return this.repo.create(schemaName, dto);
  }

  async update(schemaName: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(schemaName, id);

    return this.repo.update(schemaName, id, dto);
  }

  async remove(schemaName: string, id: string) {
    await this.findOne(schemaName, id);

    await this.repo.remove(schemaName, id);
  }

  async getStats(schemaName: string) {
    return this.repo.getStats(schemaName);
  }
}

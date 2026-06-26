import { CategoryRepository } from '../repositories/category.repository';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../lib/errors';

export class CategoryService {
  private categoryRepository = new CategoryRepository();

  async getCategories(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    return this.categoryRepository.findMany(params);
  }

  async getAllCategories() {
    return this.categoryRepository.findAllList();
  }

  async getCategoryById(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  async createCategory(data: Prisma.CategoryCreateInput) {
    return this.categoryRepository.create(data);
  }

  async updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return this.categoryRepository.update(id, data);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    return this.categoryRepository.delete(id);
  }
}

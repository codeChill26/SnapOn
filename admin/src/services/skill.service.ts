import { SkillRepository } from '../repositories/skill.repository';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '../lib/errors';

export class SkillService {
  private skillRepository = new SkillRepository();

  async getSkills(params: {
    page: number;
    limit: number;
    search?: string;
    categoryId?: string;
  }) {
    return this.skillRepository.findMany(params);
  }

  async getSkillById(id: string) {
    const skill = await this.skillRepository.findById(id);
    if (!skill) {
      throw new NotFoundError('Skill not found');
    }
    return skill;
  }

  async createSkill(data: { name: string; slug: string; categoryId: string }) {
    return this.skillRepository.create({
      name: data.name,
      slug: data.slug,
      category: { connect: { id: data.categoryId } },
    });
  }

  async updateSkill(id: string, data: { name?: string; slug?: string; categoryId?: string }) {
    const skill = await this.skillRepository.findById(id);
    if (!skill) {
      throw new NotFoundError('Skill not found');
    }
    
    const updateData: Prisma.SkillUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.categoryId) {
      updateData.category = { connect: { id: data.categoryId } };
    }

    return this.skillRepository.update(id, updateData);
  }

  async deleteSkill(id: string) {
    const skill = await this.skillRepository.findById(id);
    if (!skill) {
      throw new NotFoundError('Skill not found');
    }
    return this.skillRepository.delete(id);
  }
}

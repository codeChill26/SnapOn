import { TaskRepository } from '../repositories/task.repository';
import { TaskStatus, Prisma } from '@prisma/client';
import { NotFoundError } from '../lib/errors';

export class TaskService {
  private taskRepository = new TaskRepository();

  async getTasks(params: {
    page: number;
    limit: number;
    search?: string;
    status?: TaskStatus;
    categoryId?: string;
  }) {
    return this.taskRepository.findMany(params);
  }

  async getTaskById(id: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    return task;
  }

  async updateTask(id: string, data: Prisma.TaskUpdateInput) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    return this.taskRepository.update(id, data);
  }

  async cancelTask(id: string, reason: string, adminUserId: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    
    return this.taskRepository.update(id, {
      status: TaskStatus.CANCELLED,
      closed_at: new Date(),
      closed_reason: reason,
      users_tasks_closed_by_idTousers: { connect: { id: adminUserId } },
    });
  }

  async deleteTask(id: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found');
    }
    return this.taskRepository.delete(id);
  }
}

import { UserRepository } from '../repositories/user.repository';
import { UserStatus, Prisma } from '@prisma/client';
import { NotFoundError } from '../lib/errors';

export class UserService {
  private userRepository = new UserRepository();

  async getUsers(params: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
  }) {
    return this.userRepository.findMany(params);
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.userRepository.update(id, data);
  }

  async updateUserStatus(id: string, status: UserStatus) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.userRepository.updateStatus(id, status);
  }

  async deleteUser(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.userRepository.delete(id);
  }

  async createUser(data: Prisma.UserCreateInput) {
    return this.userRepository.create(data);
  }
}

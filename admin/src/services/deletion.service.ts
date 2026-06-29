import { DeletionRepository } from '../repositories/deletion.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotFoundError } from '../lib/errors';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import crypto from 'crypto';

export class DeletionService {
  private deletionRepository = new DeletionRepository();
  private userRepository = new UserRepository();

  async getDeletionRequests(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    return this.deletionRepository.findMany(params);
  }

  async getDeletionRequestById(id: string) {
    const request = await this.deletionRepository.findById(id);
    if (!request) {
      throw new NotFoundError('Deletion request not found');
    }
    return request;
  }

  async processDeletionRequest(id: string, action: 'APPROVE' | 'REJECT') {
    const request = await this.deletionRepository.findById(id);
    if (!request) {
      throw new NotFoundError('Deletion request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('This request has already been processed.');
    }

    if (action === 'REJECT') {
      return this.deletionRepository.updateStatus(id, 'REJECTED');
    }

    // APPROVE action: soft delete the user
    // Try to find the user by email
    const user = await prisma.user.findUnique({
      where: { email: request.email }
    });

    // Run in a transaction
    return prisma.$transaction(async (tx) => {
      if (user) {
        // Soft delete user: set status to BANNED and change name
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: UserStatus.BANNED,
            fullName: `${user.fullName}_deleted_${crypto.randomUUID()}`
          }
        });
      }

      // Update the request status to PROCESSED
      return tx.accountDeletionRequest.update({
        where: { id },
        data: { status: 'PROCESSED' }
      });
    });
  }

  async deleteRequest(id: string) {
    const request = await this.deletionRepository.findById(id);
    if (!request) {
      throw new NotFoundError('Deletion request not found');
    }
    return this.deletionRepository.delete(id);
  }
}

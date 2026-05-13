import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BlockRepository } from './block.repository';

@Injectable()
export class BlockService {
  constructor(private repo: BlockRepository) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    const already = await this.repo.isBlocked(blockerId, blockedId);
    if (already) throw new ConflictException('User is already blocked');
    await this.repo.block(blockerId, blockedId);
    return { message: 'User blocked' };
  }

  async unblock(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestException('Cannot unblock yourself');
    const exists = await this.repo.isBlocked(blockerId, blockedId);
    if (!exists) throw new NotFoundException('User is not blocked');
    await this.repo.unblock(blockerId, blockedId);
    return { message: 'User unblocked' };
  }

  async listBlocked(blockerId: string) {
    return this.repo.listBlocked(blockerId);
  }
}

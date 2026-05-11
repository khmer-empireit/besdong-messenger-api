import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { UserRepository } from '../user/user.repository';

@Injectable()
export class ContactService {
  constructor(
    private contactRepo: ContactRepository,
    private userRepo: UserRepository,
  ) {}

  async findUsers(query: string, type: 'name' | 'bd_number', page = 1, limit = 20) {
    const isBdNumber = /^BD\d+$/i.test(query.trim());
    const resolvedType = isBdNumber ? 'bd_number' : type;

    const offset = (page - 1) * limit;
    const users = resolvedType === 'bd_number'
      ? await this.userRepo.findByBdNumber(query.trim().toUpperCase())
      : await this.userRepo.findByName(query, limit, offset);

    if (!users.length) throw new NotFoundException('User not found');
    return users.map(({ id, username, display_name, bd_number, avatar_url, bio, is_online, last_seen_at }) => ({
      id, username, display_name, bd_number, avatar_url, bio, is_online, last_seen_at,
    }));
  }

  async listContacts(ownerId: string) {
    return this.contactRepo.findAll(ownerId);
  }

  async addContact(ownerId: string, contactId: string) {
    if (ownerId === contactId) {
      throw new BadRequestException('You cannot add yourself as a contact');
    }

    const target = await this.userRepo.findById(contactId);
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.contactRepo.findOne(ownerId, contactId);
    if (existing) throw new ConflictException('Contact already added');

    return this.contactRepo.add(ownerId, contactId);
  }

  async removeContact(ownerId: string, contactId: string) {
    const existing = await this.contactRepo.findOne(ownerId, contactId);
    if (!existing) throw new NotFoundException('Contact not found');
    await this.contactRepo.remove(ownerId, contactId);
  }
}

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

  async findUserByIdentifier(identifier: string) {
    const user = await this.userRepo.findByIdentifier(identifier);
    if (!user) throw new NotFoundException('User not found');
    const { id, username, display_name, bd_number, avatar_url, bio, is_online, last_seen_at } = user;
    return { id, username, display_name, bd_number, avatar_url, bio, is_online, last_seen_at };
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

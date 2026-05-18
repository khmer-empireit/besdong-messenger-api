import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { UserService } from '../user/user.service';
import { ConversationService } from '../conversation/conversation.service';

@Injectable()
export class ContactService {
  constructor(
    private contactRepo: ContactRepository,
    private userService: UserService,
    private conversationService: ConversationService,
  ) {}

  async findUsers(query: string, type: 'name' | 'bd_number', page = 1, limit = 20) {
    const isBdNumber = /^BD\d+$/i.test(query.trim());
    const resolvedType = isBdNumber ? 'bd_number' : type;

    const offset = (page - 1) * limit;
    const users = resolvedType === 'bd_number'
      ? await this.userService.findByBdNumber(query.trim())
      : await this.userService.findByName(query, limit, offset);

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

    const target = await this.userService.getProfile(contactId);
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.contactRepo.findOne(ownerId, contactId);
    if (existing) throw new ConflictException('Contact already added');

    const contact = await this.contactRepo.add(ownerId, contactId);
    await this.conversationService.findOrCreateDirect(ownerId, contactId);
    return contact;
  }

  async removeContact(ownerId: string, contactId: string) {
    const existing = await this.contactRepo.findOne(ownerId, contactId);
    if (!existing) throw new NotFoundException('Contact not found');
    await this.contactRepo.remove(ownerId, contactId);
  }
}

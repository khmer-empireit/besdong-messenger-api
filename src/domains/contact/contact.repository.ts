import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastructure/database/db.service';
import { IContactRepository, ContactWithProfile } from './interfaces/contact-repository.interface';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactRepository implements IContactRepository {
  constructor(private db: DbService) {}

  async findAll(ownerId: string): Promise<ContactWithProfile[]> {
    const rows = await this.db
      .knex('contacts')
      .where('contacts.owner_id', ownerId)
      .join('users', 'users.id', 'contacts.contact_id')
      .select(
        'contacts.id',
        'contacts.owner_id',
        'contacts.contact_id',
        'contacts.created_at',
        'users.id as user_id',
        'users.username',
        'users.display_name',
        'users.avatar_url',
        'users.bio',
        'users.is_online',
        'users.last_seen_at',
      );

    return rows.map((row) => ({
      id: row.id,
      owner_id: row.owner_id,
      contact_id: row.contact_id,
      created_at: row.created_at,
      contact: {
        id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        bio: row.bio,
        is_online: row.is_online,
        last_seen_at: row.last_seen_at,
      },
    }));
  }

  async findOne(ownerId: string, contactId: string): Promise<Contact | undefined> {
    return this.db
      .knex('contacts')
      .where({ owner_id: ownerId, contact_id: contactId })
      .first() as Promise<Contact | undefined>;
  }

  async add(ownerId: string, contactId: string): Promise<Contact> {
    const [contact] = await this.db
      .knex('contacts')
      .insert({ owner_id: ownerId, contact_id: contactId })
      .returning('*');
    return contact as Contact;
  }

  async remove(ownerId: string, contactId: string): Promise<void> {
    await this.db.knex('contacts').where({ owner_id: ownerId, contact_id: contactId }).delete();
  }
}

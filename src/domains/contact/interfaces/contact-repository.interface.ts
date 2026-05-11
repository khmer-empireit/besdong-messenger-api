import { Contact } from '../entities/contact.entity';

export interface ContactWithProfile extends Omit<Contact, 'owner_id' | 'contact_id'> {
  contact: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_online: boolean;
    last_seen_at: Date | null;
  };
}

export interface IContactRepository {
  findAll(ownerId: string): Promise<ContactWithProfile[]>;
  findOne(ownerId: string, contactId: string): Promise<Contact | undefined>;
  add(ownerId: string, contactId: string): Promise<Contact>;
  remove(ownerId: string, contactId: string): Promise<void>;
}

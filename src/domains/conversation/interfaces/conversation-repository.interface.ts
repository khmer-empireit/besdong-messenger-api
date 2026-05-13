import { Conversation } from '../entities/conversation.entity';
import { Participant } from '../entities/participant.entity';
import { ConversationType, ParticipantRole } from '../../../shared/enums';

export interface IConversationRepository {
  create(data: { type: ConversationType; name?: string; avatar_url?: string; created_by: string }): Promise<Conversation>;
  findById(id: string): Promise<Conversation | undefined>;
  findDirectBetween(userA: string, userB: string): Promise<Conversation | undefined>;
  listForUser(userId: string): Promise<Conversation[]>;
  update(id: string, data: Partial<Pick<Conversation, 'name' | 'avatar_url' | 'updated_at'>>): Promise<Conversation>;

  addParticipant(data: { conversation_id: string; user_id: string; role?: ParticipantRole }): Promise<void>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  getParticipant(conversationId: string, userId: string): Promise<Participant | undefined>;
  getParticipants(conversationId: string): Promise<Participant[]>;
  setMute(conversationId: string, userId: string, mutedUntil: Date | null): Promise<void>;
}

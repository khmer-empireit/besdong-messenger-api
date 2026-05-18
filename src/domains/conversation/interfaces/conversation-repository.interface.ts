import { Conversation } from '../entities/conversation.entity';
import { ConversationListItem } from '../entities/conversation-list-item.entity';
import { Participant } from '../entities/participant.entity';
import { ConversationType, ParticipantRole } from '../../../shared/enums';

export interface IConversationRepository {
  create(data: { type: ConversationType; name?: string; avatar_url?: string; created_by: string }): Promise<Conversation>;
  findById(id: string): Promise<Conversation | undefined>;
  findDirectBetween(userA: string, userB: string): Promise<Conversation | undefined>;
  listForUser(userId: string, cursor?: string, limit?: number): Promise<ConversationListItem[]>;
  searchForUser(userId: string, query: string): Promise<ConversationListItem[]>;
  update(id: string, data: Partial<Pick<Conversation, 'name' | 'avatar_url' | 'updated_at'>>): Promise<Conversation>;
  pinConversation(conversationId: string, userId: string, pin: boolean): Promise<void>;

  addParticipant(data: { conversation_id: string; user_id: string; role?: ParticipantRole }): Promise<void>;
  removeParticipant(conversationId: string, userId: string): Promise<void>;
  getParticipant(conversationId: string, userId: string): Promise<Participant | undefined>;
  getParticipants(conversationId: string): Promise<Participant[]>;
  updateParticipantRole(conversationId: string, userId: string, role: ParticipantRole.Admin | ParticipantRole.Member): Promise<void>;
  getOfflineParticipantIds(conversationId: string, excludeUserId: string): Promise<string[]>;
  setMute(conversationId: string, userId: string, mutedUntil: Date | null): Promise<void>;
}

export interface IBlockRepository {
  block(blockerId: string, blockedId: string): Promise<void>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEither(userA: string, userB: string): Promise<boolean>;
  listBlocked(blockerId: string): Promise<{ id: string; username: string; display_name: string; avatar_url: string | null }[]>;
}

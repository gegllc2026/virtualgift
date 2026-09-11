export type DomainUser = {
  id: string;
  externalUserId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: string;
  status: string;
  locale: string;
};

export type EnsureUserInput = {
  externalUserId: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  role?: string;
  locale?: string;
};

export interface UserProvider {
  getUser(userId: string): Promise<DomainUser | null>;
  getUserByExternalId(externalUserId: string): Promise<DomainUser | null>;
  ensureUser(input: EnsureUserInput): Promise<DomainUser>;
}

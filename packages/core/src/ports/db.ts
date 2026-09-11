/**
 * Minimal DB port so core engines stay free of Prisma imports.
 * The API injects a Prisma-backed implementation.
 */
export type DbClient = {
  $transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>;
  user: UserRepo;
  wallet: WalletRepo;
  walletTransaction: WalletTxRepo;
  gift: GiftRepo;
  giftSend: GiftSendRepo;
  livestream: LivestreamRepo;
  battle: BattleRepo;
  battleParticipant: BattleParticipantRepo;
  battleEvent: BattleEventRepo;
  coinPackage: CoinPackageRepo;
  payment: PaymentRepo;
  idempotencyRecord: IdempotencyRepo;
  leaderboardSnapshot: LeaderboardRepo;
  systemSetting: SettingRepo;
  auditLog: AuditRepo;
};

export type DbTx = Omit<DbClient, "$transaction">;

export type UserRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type WalletRepo = {
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

export type WalletTxRepo = {
  create(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type GiftRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type GiftSendRepo = {
  create(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
  groupBy(args: unknown): Promise<unknown>;
};

export type LivestreamRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
};

export type BattleRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type BattleParticipantRepo = {
  findMany(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<unknown>;
};

export type BattleEventRepo = {
  create(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
};

export type CoinPackageRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type PaymentRepo = {
  findUnique(args: unknown): Promise<unknown>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
};

export type IdempotencyRepo = {
  findUnique(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

export type LeaderboardRepo = {
  findUnique(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
};

export type SettingRepo = {
  findUnique(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
};

export type AuditRepo = {
  create(args: unknown): Promise<unknown>;
  findMany(args: unknown): Promise<unknown>;
};

import { AppError, ERROR_CODES, WALLET_TX_TYPES, type WalletTxType } from "@gateway/shared";
import type { DbClient, DbTx } from "../ports/db.js";
import { metrics } from "../metrics.js";

export type WalletRecord = {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: string;
};

export type WalletTxRecord = {
  id: string;
  userId: string;
  walletId: string;
  type: WalletTxType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  status: string;
};

type UserLite = { id: string; status: string };

async function getActiveUser(db: DbTx | DbClient, userId: string): Promise<UserLite> {
  const user = (await db.user.findUnique({ where: { id: userId } })) as UserLite | null;
  if (!user) throw new AppError(ERROR_CODES.NOT_FOUND, "User not found.", 404);
  if (user.status !== "ACTIVE") {
    throw new AppError(ERROR_CODES.USER_INACTIVE, "User is not active.", 403);
  }
  return user;
}

export async function ensureWallet(db: DbTx | DbClient, userId: string): Promise<WalletRecord> {
  await getActiveUser(db, userId);
  const existing = (await db.wallet.findUnique({ where: { userId } })) as WalletRecord | null;
  if (existing) return existing;
  return (await db.wallet.create({
    data: { userId, balance: 0, currency: "COIN", status: "ACTIVE" },
  })) as WalletRecord;
}

export type ApplyBalanceChangeInput = {
  userId: string;
  amount: number;
  type: WalletTxType;
  reference: string;
  metadata?: Record<string, unknown>;
  allowNegative?: boolean;
};

/**
 * Atomically adjust wallet balance and write an immutable ledger row.
 * `amount` is signed: negative = debit, positive = credit.
 */
export async function applyBalanceChange(
  db: DbClient,
  input: ApplyBalanceChangeInput,
): Promise<{ wallet: WalletRecord; transaction: WalletTxRecord }> {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new AppError(ERROR_CODES.INVALID_AMOUNT, "Amount must be a non-zero integer.");
  }

  return db.$transaction(async (tx) => {
    await getActiveUser(tx, input.userId);

    let wallet = (await tx.wallet.findUnique({
      where: { userId: input.userId },
    })) as WalletRecord | null;

    if (!wallet) {
      wallet = (await tx.wallet.create({
        data: { userId: input.userId, balance: 0, currency: "COIN", status: "ACTIVE" },
      })) as WalletRecord;
    }

    if (wallet.status !== "ACTIVE") {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Wallet is not active.", 403);
    }

    const existingTx = (await tx.walletTransaction.findUnique({
      where: { reference: input.reference },
    })) as WalletTxRecord | null;

    if (existingTx) {
      return { wallet, transaction: existingTx };
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + input.amount;

    if (balanceAfter < 0 && !input.allowNegative) {
      metrics.inc("gift_failed_total");
      throw new AppError(ERROR_CODES.INSUFFICIENT_BALANCE, "Insufficient coin balance.");
    }

    const updated = (await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    })) as WalletRecord;

    const transaction = (await tx.walletTransaction.create({
      data: {
        userId: input.userId,
        walletId: wallet.id,
        type: input.type,
        amount: input.amount,
        balanceBefore,
        balanceAfter,
        reference: input.reference,
        status: "COMPLETED",
        metadata: input.metadata ?? undefined,
      },
    })) as WalletTxRecord;

    return { wallet: updated, transaction };
  });
}

export async function debitCoins(
  db: DbClient,
  input: {
    userId: string;
    amount: number;
    type: WalletTxType;
    reference: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (input.amount <= 0) {
    throw new AppError(ERROR_CODES.INVALID_AMOUNT, "Debit amount must be positive.");
  }
  return applyBalanceChange(db, {
    ...input,
    amount: -Math.abs(input.amount),
  });
}

export async function creditCoins(
  db: DbClient,
  input: {
    userId: string;
    amount: number;
    type: WalletTxType;
    reference: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (input.amount <= 0) {
    throw new AppError(ERROR_CODES.INVALID_AMOUNT, "Credit amount must be positive.");
  }
  return applyBalanceChange(db, {
    ...input,
    amount: Math.abs(input.amount),
    type: input.type ?? WALLET_TX_TYPES.PURCHASE,
  });
}

export async function getWalletBalance(db: DbClient, userId: string): Promise<WalletRecord> {
  return ensureWallet(db, userId);
}

export * from "./idempotency.js";

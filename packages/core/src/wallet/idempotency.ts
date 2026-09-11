import { AppError, ERROR_CODES } from "@gateway/shared";
import type { DbClient } from "../ports/db.js";

export type IdempotencyRecord = {
  id: string;
  userId: string;
  key: string;
  requestHash: string | null;
  responseBody: unknown;
  status: "STARTED" | "COMPLETED" | "FAILED";
};

export async function beginIdempotent<T>(
  db: DbClient,
  userId: string,
  key: string,
  requestHash: string | undefined,
  execute: () => Promise<T>,
): Promise<{ replay: boolean; result: T }> {
  const existing = (await db.idempotencyRecord.findUnique({
    where: { userId_key: { userId, key } },
  })) as IdempotencyRecord | null;

  if (existing) {
    if (existing.status === "COMPLETED" && existing.responseBody != null) {
      return { replay: true, result: existing.responseBody as T };
    }
    if (existing.status === "STARTED") {
      throw new AppError(
        ERROR_CODES.DUPLICATE_REQUEST,
        "A request with this idempotency key is already in progress.",
        409,
      );
    }
    if (
      existing.requestHash &&
      requestHash &&
      existing.requestHash !== requestHash
    ) {
      throw new AppError(
        ERROR_CODES.IDEMPOTENCY_CONFLICT,
        "Idempotency key reused with a different payload.",
        409,
      );
    }
  } else {
    await db.idempotencyRecord.create({
      data: {
        userId,
        key,
        requestHash: requestHash ?? null,
        status: "STARTED",
      },
    });
  }

  try {
    const result = await execute();
    await db.idempotencyRecord.update({
      where: { userId_key: { userId, key } },
      data: {
        status: "COMPLETED",
        responseBody: result as object,
        requestHash: requestHash ?? null,
      },
    });
    return { replay: false, result };
  } catch (err) {
    await db.idempotencyRecord.update({
      where: { userId_key: { userId, key } },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

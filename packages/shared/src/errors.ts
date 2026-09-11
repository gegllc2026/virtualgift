export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  GIFT_UNAVAILABLE: "GIFT_UNAVAILABLE",
  DUPLICATE_REQUEST: "DUPLICATE_REQUEST",
  BATTLE_INVALID_STATE: "BATTLE_INVALID_STATE",
  BATTLE_FULL: "BATTLE_FULL",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  USER_INACTIVE: "USER_INACTIVE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorResponse(code: ErrorCode, message: string, details?: unknown) {
  return {
    success: false as const,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}

export function successResponse<T>(data: T) {
  return { success: true as const, data };
}

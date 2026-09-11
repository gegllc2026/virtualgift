import { z } from "zod";
import { ANIMATION_TYPES, BATTLE_STATUSES } from "./constants.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const sendGiftSchema = z.object({
  giftId: z.string().min(1),
  receiverId: z.string().min(1),
  livestreamId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999).default(1),
  battleId: z.string().optional(),
  idempotencyKey: z.string().min(8).max(128),
});

export const createGiftSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional(),
  categoryId: z.string().optional().nullable(),
  coinCost: z.number().int().min(0).max(10_000_000),
  iconUrl: z.string().url().optional().nullable(),
  animationUrl: z.string().url().optional().nullable(),
  animationType: z.enum([
    ANIMATION_TYPES.LOTTIE,
    ANIMATION_TYPES.SVGA,
    ANIMATION_TYPES.GIF,
    ANIMATION_TYPES.MP4,
    ANIMATION_TYPES.WEBM,
    ANIMATION_TYPES.IMAGE,
    ANIMATION_TYPES.NONE,
  ]).default(ANIMATION_TYPES.NONE),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.unknown()).optional(),
});

export const updateGiftSchema = createGiftSchema.partial();

export const createCoinPackageSchema = z.object({
  name: z.string().min(1).max(120),
  coinAmount: z.number().int().min(1),
  price: z.number().int().min(1),
  currency: z.string().length(3).default("USD"),
  stripePriceId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateCoinPackageSchema = createCoinPackageSchema.partial();

export const checkoutSchema = z.object({
  coinPackageId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  idempotencyKey: z.string().min(8).max(128),
});

export const createBattleSchema = z.object({
  livestreamId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(2).max(8),
  durationSeconds: z.number().int().min(30).max(3600).optional(),
  scoreMultiplier: z.number().positive().max(100).optional(),
  battleType: z.string().default("PK"),
});

export const battleActionSchema = z.object({
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const walletAdjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
});

export const ensureUserSchema = z.object({
  externalUserId: z.string().min(1),
  username: z.string().min(1).max(80),
  displayName: z.string().min(1).max(120),
  avatar: z.string().url().optional().nullable(),
  role: z.enum(["VIEWER", "CREATOR", "MODERATOR", "ADMIN", "SUPER_ADMIN", "ANALYST"]).optional(),
});

export const loginSchema = z.object({
  externalUserId: z.string().min(1),
  username: z.string().min(1).max(80),
  displayName: z.string().min(1).max(120),
  avatar: z.string().url().optional().nullable(),
  role: z.enum(["VIEWER", "CREATOR", "MODERATOR", "ADMIN", "SUPER_ADMIN", "ANALYST"]).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type SendGiftInput = z.infer<typeof sendGiftSchema>;
export type CreateGiftInput = z.infer<typeof createGiftSchema>;
export type UpdateGiftInput = z.infer<typeof updateGiftSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CreateBattleInput = z.infer<typeof createBattleSchema>;
export type EnsureUserInput = z.infer<typeof ensureUserSchema>;

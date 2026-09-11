import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, ERROR_CODES, isAdminRole, canMutateAdmin } from "@gateway/shared";

export type AuthUser = {
  sub: string;
  externalUserId: string;
  role: string;
  displayName: string;
};

export async function authenticate(req: FastifyRequest, _reply: FastifyReply) {
  try {
    const payload = await req.jwtVerify<AuthUser>();
    (req as FastifyRequest & { user: AuthUser }).user = payload;
  } catch {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "Authentication required.", 401);
  }
}

export function requireRoles(...roles: string[]) {
  return async (req: FastifyRequest) => {
    await authenticate(req, {} as FastifyReply);
    const user = (req as FastifyRequest & { user: AuthUser }).user;
    if (!roles.includes(user.role) && user.role !== "SUPER_ADMIN") {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Insufficient permissions.", 403);
    }
  };
}

export async function requireAdmin(req: FastifyRequest) {
  await authenticate(req, {} as FastifyReply);
  const user = (req as FastifyRequest & { user: AuthUser }).user;
  if (!isAdminRole(user.role)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Admin access required.", 403);
  }
}

export async function requireAdminMutate(req: FastifyRequest) {
  await requireAdmin(req);
  const user = (req as FastifyRequest & { user: AuthUser }).user;
  if (!canMutateAdmin(user.role) && user.role !== "SUPER_ADMIN") {
    throw new AppError(ERROR_CODES.FORBIDDEN, "Admin write access required.", 403);
  }
}

export function getUser(req: FastifyRequest): AuthUser {
  return (req as FastifyRequest & { user: AuthUser }).user;
}

export async function registerAuthHooks(_app: FastifyInstance) {
  // reserved for global hooks if needed
}

export const USER_ROLES = {
  VIEWER: "VIEWER",
  CREATOR: "CREATOR",
  MODERATOR: "MODERATOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  ANALYST: "ANALYST",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MODERATOR,
  USER_ROLES.ANALYST,
];

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as string[]).includes(role);
}

export function canMutateAdmin(role: string): boolean {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

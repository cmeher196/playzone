import { getSessionUser, hashPassword } from "./auth";
import { ensureAdminAccount, type PublicPlayer } from "./registrations";

/**
 * Admin bootstrapping and authorization.
 *
 * The admin is just a normal account with `role: "admin"`. Credentials come
 * from the environment (with dev-friendly defaults) and the account is seeded
 * on demand so the admin can log in through the normal /login flow.
 */
const ADMIN_MOBILE = process.env.ADMIN_MOBILE ?? "9000000000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Administrator";

let seedPromise: Promise<void> | null = null;

/** Idempotently ensures the configured admin account exists (once per process). */
export function seedAdmin(): Promise<void> {
  if (!seedPromise) {
    seedPromise = ensureAdminAccount({
      mobile: ADMIN_MOBILE,
      name: ADMIN_NAME,
      passwordHash: hashPassword(ADMIN_PASSWORD),
    }).catch((error) => {
      seedPromise = null; // allow a retry after a transient failure
      throw error;
    });
  }
  return seedPromise;
}

export function isAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return !!user && user.role === "admin";
}

/** Returns the current session user only if they are an admin, else null. */
export async function getAdminUser(): Promise<PublicPlayer | null> {
  const user = await getSessionUser();
  return isAdmin(user) ? user : null;
}

export const ADMIN_DEFAULTS = { mobile: ADMIN_MOBILE, name: ADMIN_NAME } as const;

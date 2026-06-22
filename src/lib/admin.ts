import { auth } from '@clerk/nextjs/server';

/**
 * Env-var allowlist, not a DB role column -- consistent with this project's
 * low-infra style (e.g. APP_OPENAI_KEY). Changing who's an admin requires a
 * deploy, not a runtime action; that's an accepted limitation for v1.
 * Comma-separated Clerk user IDs.
 */
function getAdminUserIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/**
 * Returns the caller's userId if they're an admin, or null otherwise. Every
 * admin route must call this before touching any cross-user data -- there is
 * no RLS safety net here, same discipline as the userId-scoped queries
 * elsewhere in this app, just inverted (checking the caller *is* privileged
 * rather than *owns* the row).
 */
export async function requireAdmin(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getAdminUserIds().has(userId) ? userId : null;
}

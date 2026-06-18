import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-only, used exclusively from src/lib/disputes.ts and src/lib/analyses.ts,
// which are only ever called from API routes that already check Clerk's auth()
// and reject unauthenticated requests before reaching this client. The service
// role key bypasses RLS -- there is no Supabase Auth session to bridge from
// Clerk here, so auth.uid()-based policies can never resolve a user; the
// Clerk auth() check in each route is the actual trust boundary, not RLS.
export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

import { requireAdmin } from '@/lib/admin';

// Debug-only route to verify the admin gate works before any real admin UI
// exists. Not referenced by any page -- exercised manually or by a future
// admin smoke test.
export async function GET() {
  const adminUserId = await requireAdmin();
  if (!adminUserId) {
    return Response.json({ success: false, error: 'forbidden' }, { status: 403 });
  }

  return Response.json({ success: true, data: { adminUserId } });
}

import { requireAdmin } from '@/lib/admin';
import { getAdminMembers } from '@/lib/adminMembers';

export async function GET() {
  try {
    const adminUserId = await requireAdmin();
    if (!adminUserId) {
      return Response.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    const members = await getAdminMembers();
    return Response.json({ success: true, data: members });
  } catch (error) {
    console.error('[admin/members] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

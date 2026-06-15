import { auth } from '@clerk/nextjs/server';
import { updateDisputeStatus } from '@/lib/disputes';
import type { DisputeStatus } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { status: DisputeStatus };

    const allowed: DisputeStatus[] = ['sent', 'responded', 'resolved', 'expired'];
    if (!allowed.includes(body.status)) {
      return Response.json({ success: false, error: 'invalid_status' }, { status: 400 });
    }

    await updateDisputeStatus(id, body.status);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[disputes/[id]] PATCH error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

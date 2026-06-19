import { auth } from '@clerk/nextjs/server';
import { updateCompletedActions } from '@/lib/analyses';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { completedActions?: unknown };

    if (!Array.isArray(body.completedActions) || !body.completedActions.every((n) => typeof n === 'number')) {
      return Response.json({ success: false, error: 'invalid_completed_actions' }, { status: 400 });
    }

    await updateCompletedActions(id, userId, body.completedActions);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[analyses/[id]/actions] PATCH error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

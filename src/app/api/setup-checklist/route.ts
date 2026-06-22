import { auth } from '@clerk/nextjs/server';
import { getSetupChecklist, upsertSetupChecklist } from '@/lib/setupChecklist';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const checklist = await getSetupChecklist(userId);
    return Response.json({ success: true, data: checklist });
  } catch (error) {
    console.error('[setup-checklist] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { completed_steps?: unknown; nudge_email_enabled?: unknown };
    if (!Array.isArray(body.completed_steps) || typeof body.nudge_email_enabled !== 'boolean') {
      return Response.json({ success: false, error: 'invalid_checklist' }, { status: 400 });
    }

    const saved = await upsertSetupChecklist(userId, body.completed_steps as number[], body.nudge_email_enabled);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[setup-checklist] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

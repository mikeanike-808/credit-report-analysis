import { auth } from '@clerk/nextjs/server';
import { getGrowProgress, upsertGrowProgress } from '@/lib/growProgress';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const progress = await getGrowProgress(userId);
    return Response.json({ success: true, data: progress });
  } catch (error) {
    console.error('[grow-progress] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { completed?: { maintain?: unknown; grow?: unknown } };
    if (!body.completed || !Array.isArray(body.completed.maintain) || !Array.isArray(body.completed.grow)) {
      return Response.json({ success: false, error: 'invalid_progress' }, { status: 400 });
    }

    const saved = await upsertGrowProgress(userId, {
      maintain: body.completed.maintain as number[],
      grow: body.completed.grow as number[],
    });
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[grow-progress] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { getJourneyProgress, setJourneyProgress, JOURNEY_GOAL_COUNT } from '@/lib/journey';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const progress = await getJourneyProgress(userId);
    return Response.json({ success: true, data: progress });
  } catch (error) {
    console.error('[journey] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

// Advances or retreats exactly one step -- mirrors the mockup's toggle logic
// (a goal can only be marked done if it's the current goal, and can only be
// un-marked if it's the most recently completed one), so current_goal_index
// can never skip ahead into an invalid state.
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { action?: unknown };
    if (body.action !== 'advance' && body.action !== 'retreat') {
      return Response.json({ success: false, error: 'invalid_action' }, { status: 400 });
    }

    const current = await getJourneyProgress(userId);
    const next = body.action === 'advance'
      ? Math.min(JOURNEY_GOAL_COUNT, current.current_goal_index + 1)
      : Math.max(0, current.current_goal_index - 1);

    const updated = await setJourneyProgress(userId, next);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[journey] PATCH error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

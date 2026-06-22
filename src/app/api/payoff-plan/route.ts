import { auth } from '@clerk/nextjs/server';
import { getPayoffPlan, upsertPayoffPlan } from '@/lib/payoffPlans';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const plan = await getPayoffPlan(userId);
    return Response.json({ success: true, data: plan });
  } catch (error) {
    console.error('[payoff-plan] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { extra_payment?: unknown };
    if (typeof body.extra_payment !== 'number' || body.extra_payment < 0) {
      return Response.json({ success: false, error: 'invalid_extra_payment' }, { status: 400 });
    }

    const saved = await upsertPayoffPlan(userId, body.extra_payment);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[payoff-plan] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

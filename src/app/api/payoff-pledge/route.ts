import { auth } from '@clerk/nextjs/server';
import { getPayoffPledge, upsertPayoffPledge } from '@/lib/payoffPledges';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const pledge = await getPayoffPledge(userId);
    return Response.json({ success: true, data: pledge });
  } catch (error) {
    console.error('[payoff-pledge] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as {
      vision_text?: unknown; plan_text?: unknown; importance?: unknown; pledge_name?: unknown; sign?: unknown;
    };
    if (
      typeof body.vision_text !== 'string' || typeof body.plan_text !== 'string' ||
      typeof body.importance !== 'number' || typeof body.pledge_name !== 'string' ||
      typeof body.sign !== 'boolean'
    ) {
      return Response.json({ success: false, error: 'invalid_pledge' }, { status: 400 });
    }

    const saved = await upsertPayoffPledge(userId, {
      vision_text: body.vision_text, plan_text: body.plan_text,
      importance: body.importance, pledge_name: body.pledge_name, sign: body.sign,
    });
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[payoff-pledge] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

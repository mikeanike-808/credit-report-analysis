import { auth } from '@clerk/nextjs/server';
import { getDebtsByUser, replaceDebts, type DebtInput } from '@/lib/debts';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const debts = await getDebtsByUser(userId);
    return Response.json({ success: true, data: debts });
  } catch (error) {
    console.error('[debts] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { debts?: unknown };
    if (!Array.isArray(body.debts)) {
      return Response.json({ success: false, error: 'invalid_debts' }, { status: 400 });
    }

    const debts = body.debts as DebtInput[];
    const valid = debts.every((d) =>
      typeof d.name === 'string' && d.name.trim().length > 0 &&
      typeof d.balance === 'number' && d.balance >= 0 &&
      typeof d.apr === 'number' && d.apr >= 0 &&
      typeof d.min_payment === 'number' && d.min_payment >= 0 &&
      (d.source === 'report' || d.source === 'manual'),
    );
    if (!valid) {
      return Response.json({ success: false, error: 'invalid_debts' }, { status: 400 });
    }

    const saved = await replaceDebts(userId, debts);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[debts] POST error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { getBudget, upsertBudget } from '@/lib/budgets';
import type { BudgetCategory } from '@/types';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const budget = await getBudget(userId);
    return Response.json({ success: true, data: budget });
  } catch (error) {
    console.error('[budgets] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { income?: unknown; categories?: unknown };
    if (typeof body.income !== 'number' || body.income < 0 || !Array.isArray(body.categories)) {
      return Response.json({ success: false, error: 'invalid_budget' }, { status: 400 });
    }

    const categories = body.categories as BudgetCategory[];
    const valid = categories.every((c) =>
      typeof c.name === 'string' && typeof c.amount === 'number' && c.amount >= 0 && typeof c.color === 'string',
    );
    if (!valid) {
      return Response.json({ success: false, error: 'invalid_budget' }, { status: 400 });
    }

    const saved = await upsertBudget(userId, body.income, categories);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[budgets] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { getAnalysesByUser } from '@/lib/analyses';

// Lists every saved analysis (one per AI call) for the History page -- distinct
// from /api/analyses/latest, which only returns the most recent one.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const analyses = await getAnalysesByUser(userId);
    return Response.json({ success: true, data: analyses });
  } catch (error) {
    console.error('[analyses] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

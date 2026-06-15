import { auth } from '@clerk/nextjs/server';
import { getDisputesByUser } from '@/lib/disputes';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const disputes = await getDisputesByUser(userId);
    return Response.json({ success: true, data: disputes });
  } catch (error) {
    console.error('[disputes] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

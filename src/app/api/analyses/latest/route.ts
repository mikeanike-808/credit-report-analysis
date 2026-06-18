import { auth } from '@clerk/nextjs/server';
import { getLatestAnalysis } from '@/lib/analyses';

// Lets /home and /dispute-letters recover after a refresh wipes AnalysisContext
// (Context is in-memory only) without forcing the user back through /upload.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const analysis = await getLatestAnalysis(userId);
    return Response.json({ success: true, data: analysis });
  } catch (error) {
    console.error('[analyses/latest] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

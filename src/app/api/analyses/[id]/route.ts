import { auth } from '@clerk/nextjs/server';
import { deleteAnalysis } from '@/lib/analyses';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const { id } = await params;
    await deleteAnalysis(id, userId);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[analyses/[id]] DELETE error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { deleteNegativeItem } from '@/lib/analyses';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { index?: unknown };

    if (typeof body.index !== 'number' || body.index < 0) {
      return Response.json({ success: false, error: 'invalid_index' }, { status: 400 });
    }

    const updated = await deleteNegativeItem(id, userId, body.index);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[analyses/[id]/items] DELETE error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

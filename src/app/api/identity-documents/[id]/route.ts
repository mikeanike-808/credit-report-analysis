import { auth } from '@clerk/nextjs/server';
import { deleteIdentityDocument } from '@/lib/identityDocuments';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const { id } = await params;
    await deleteIdentityDocument(userId, id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[identity-documents/[id]] DELETE error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

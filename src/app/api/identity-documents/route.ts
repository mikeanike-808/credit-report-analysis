import { auth } from '@clerk/nextjs/server';
import { getIdentityDocuments, uploadIdentityDocument } from '@/lib/identityDocuments';
import type { IdentityDocType } from '@/types';

const VALID_TYPES: IdentityDocType[] = ['drivers_license', 'ssn_proof', 'address_proof'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const docs = await getIdentityDocuments(userId);
    return Response.json({ success: true, data: docs });
  } catch (error) {
    console.error('[identity-documents] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const formData = await request.formData();
    const docType = formData.get('doc_type');
    const file = formData.get('file');

    if (typeof docType !== 'string' || !VALID_TYPES.includes(docType as IdentityDocType)) {
      return Response.json({ success: false, error: 'invalid_doc_type' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ success: false, error: 'missing_file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ success: false, error: 'file_too_large' }, { status: 413 });
    }

    const saved = await uploadIdentityDocument(userId, docType as IdentityDocType, file);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[identity-documents] POST error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

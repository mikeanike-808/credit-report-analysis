import { createClient } from '@/lib/supabase/server';
import type { IdentityDocType, IdentityDocument } from '@/types';

const BUCKET = 'identity-docs';

export async function getIdentityDocuments(userId: string): Promise<IdentityDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('identity_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch identity documents: ${error.message}`);
  return (data ?? []) as IdentityDocument[];
}

/**
 * Uploads the file to Storage at a user-prefixed path (required so a path
 * leak can never expose another user's document -- there's no Storage RLS
 * enforcement here either, same as every DB table in this app) and replaces
 * any existing document of the same type for this user, so re-uploading
 * never leaves an orphaned old file behind.
 */
export async function uploadIdentityDocument(userId: string, docType: IdentityDocType, file: File): Promise<IdentityDocument> {
  const supabase = await createClient();

  const existing = await supabase
    .from('identity_documents')
    .select('*')
    .eq('user_id', userId)
    .eq('doc_type', docType)
    .maybeSingle();
  if (existing.data) {
    await deleteIdentityDocument(userId, (existing.data as IdentityDocument).id);
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (uploadError) throw new Error(`Failed to upload document: ${uploadError.message}`);

  const { data, error } = await supabase
    .from('identity_documents')
    .insert({ user_id: userId, doc_type: docType, storage_path: path, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(`Failed to save document record: ${error.message}`);

  return data as IdentityDocument;
}

/** Deletes both the DB row and the underlying Storage object, scoped by userId. */
export async function deleteIdentityDocument(userId: string, id: string): Promise<void> {
  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('identity_documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchError) throw new Error(`Failed to fetch document: ${fetchError.message}`);
  if (!doc) return;

  await supabase.storage.from(BUCKET).remove([(doc as IdentityDocument).storage_path]);

  const { error: deleteError } = await supabase
    .from('identity_documents')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (deleteError) throw new Error(`Failed to delete document record: ${deleteError.message}`);
}

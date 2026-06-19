import { createClient } from '@/lib/supabase/server';
import type { AnalysisRecord, AnalysisResult, UserInfo } from '@/types';

export async function saveAnalysis(
  userId: string,
  userInfo: UserInfo,
  result: AnalysisResult,
): Promise<AnalysisRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .insert({ user_id: userId, user_info: userInfo, result })
    .select()
    .single();

  if (error) throw new Error(`Failed to save analysis: ${error.message}`);
  return data as AnalysisRecord;
}

/** Most recent saved analysis for this user, or null if they have none yet. */
export async function getLatestAnalysis(userId: string): Promise<AnalysisRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch latest analysis: ${error.message}`);
  return (data as AnalysisRecord | null) ?? null;
}

/** Every saved analysis for this user, newest first -- one per AI call, for the History page. */
export async function getAnalysesByUser(userId: string): Promise<AnalysisRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch analyses: ${error.message}`);
  return (data ?? []) as AnalysisRecord[];
}

/**
 * Overwrites the full set of completed action-plan indices for one analysis --
 * scoped to userId so a user can only ever update their own rows, even though
 * this client uses the service role key and would otherwise bypass that check.
 */
export async function updateCompletedActions(id: string, userId: string, completedActions: number[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('analyses')
    .update({ completed_actions: completedActions })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update completed actions: ${error.message}`);
}

/**
 * Deletes one analysis -- scoped to userId so a user can only ever delete
 * their own rows, even though this client uses the service role key and
 * would otherwise bypass that check entirely.
 */
export async function deleteAnalysis(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete analysis: ${error.message}`);
}

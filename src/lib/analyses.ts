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

import { createClient } from '@/lib/supabase/server';
import type { GrowProgress } from '@/types';

export async function getGrowProgress(userId: string): Promise<GrowProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('grow_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch grow progress: ${error.message}`);
  return (data as GrowProgress | null) ?? null;
}

export async function upsertGrowProgress(userId: string, completed: { maintain: number[]; grow: number[] }): Promise<GrowProgress> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('grow_progress')
    .upsert({ user_id: userId, completed, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save grow progress: ${error.message}`);
  return data as GrowProgress;
}

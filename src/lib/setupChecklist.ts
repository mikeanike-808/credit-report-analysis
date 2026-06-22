import { createClient } from '@/lib/supabase/server';
import type { SetupChecklist } from '@/types';

export async function getSetupChecklist(userId: string): Promise<SetupChecklist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('setup_checklist')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch setup checklist: ${error.message}`);
  return (data as SetupChecklist | null) ?? null;
}

export async function upsertSetupChecklist(userId: string, completedSteps: number[], nudgeEmailEnabled: boolean): Promise<SetupChecklist> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('setup_checklist')
    .upsert(
      { user_id: userId, completed_steps: completedSteps, nudge_email_enabled: nudgeEmailEnabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to save setup checklist: ${error.message}`);
  return data as SetupChecklist;
}

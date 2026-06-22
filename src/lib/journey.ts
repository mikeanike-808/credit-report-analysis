import { createClient } from '@/lib/supabase/server';
import type { JourneyProgress } from '@/types';

/** Total number of sequential goals in the sidebar journey. */
export const JOURNEY_GOAL_COUNT = 3;

/** Returns the user's journey progress, defaulting to goal 0 if no row exists yet. */
export async function getJourneyProgress(userId: string): Promise<JourneyProgress> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journey_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch journey progress: ${error.message}`);
  if (data) return data as JourneyProgress;

  return { user_id: userId, current_goal_index: 0, updated_at: new Date().toISOString() };
}

/**
 * Sets current_goal_index, upserting the row. Scoped by userId like every
 * other table in this app. The route calling this is responsible for
 * validating the new index is a legal sequential transition (+1 or -1 from
 * the current value) -- this function just persists whatever it's given.
 */
export async function setJourneyProgress(userId: string, currentGoalIndex: number): Promise<JourneyProgress> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journey_progress')
    .upsert(
      { user_id: userId, current_goal_index: currentGoalIndex, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to update journey progress: ${error.message}`);
  return data as JourneyProgress;
}

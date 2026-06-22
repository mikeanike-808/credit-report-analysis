import { createClient } from '@/lib/supabase/server';
import type { PayoffPlanRecord } from '@/types';

export async function getPayoffPlan(userId: string): Promise<PayoffPlanRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payoff_plans')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch payoff plan: ${error.message}`);
  return (data as PayoffPlanRecord | null) ?? null;
}

export async function upsertPayoffPlan(userId: string, extraPayment: number): Promise<PayoffPlanRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payoff_plans')
    .upsert({ user_id: userId, extra_payment: extraPayment, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save payoff plan: ${error.message}`);
  return data as PayoffPlanRecord;
}

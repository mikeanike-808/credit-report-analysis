import { createClient } from '@/lib/supabase/server';
import type { Debt } from '@/types';

export interface DebtInput {
  name: string;
  balance: number;
  apr: number;
  min_payment: number;
  source: 'report' | 'manual';
  report_account_ref: string | null;
}

export async function getDebtsByUser(userId: string): Promise<Debt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .order('balance', { ascending: false });

  if (error) throw new Error(`Failed to fetch debts: ${error.message}`);
  return (data ?? []) as Debt[];
}

/**
 * Replaces the user's entire debt list with a fresh set from the intake
 * wizard. The wizard is the single source of truth each time it's run --
 * simpler and safer than trying to diff/merge against whatever was there
 * before, and avoids accumulating duplicates on repeat visits.
 */
export async function replaceDebts(userId: string, debts: DebtInput[]): Promise<Debt[]> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from('debts').delete().eq('user_id', userId);
  if (deleteError) throw new Error(`Failed to clear old debts: ${deleteError.message}`);

  if (debts.length === 0) return [];

  const { data, error } = await supabase
    .from('debts')
    .insert(debts.map((d) => ({ ...d, user_id: userId })))
    .select();

  if (error) throw new Error(`Failed to save debts: ${error.message}`);
  return (data ?? []) as Debt[];
}

export async function updateDebtStatus(id: string, userId: string, status: 'active' | 'paid_off'): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('debts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update debt: ${error.message}`);
}

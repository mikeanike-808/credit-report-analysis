import { createClient } from '@/lib/supabase/server';
import type { Budget, BudgetCategory } from '@/types';

export async function getBudget(userId: string): Promise<Budget | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch budget: ${error.message}`);
  return (data as Budget | null) ?? null;
}

export async function upsertBudget(userId: string, income: number, categories: BudgetCategory[]): Promise<Budget> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('budgets')
    .upsert({ user_id: userId, income, categories, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save budget: ${error.message}`);
  return data as Budget;
}

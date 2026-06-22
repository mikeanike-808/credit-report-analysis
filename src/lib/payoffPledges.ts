import { createClient } from '@/lib/supabase/server';
import type { PayoffPledge } from '@/types';

export async function getPayoffPledge(userId: string): Promise<PayoffPledge | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payoff_pledges')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch pledge: ${error.message}`);
  return (data as PayoffPledge | null) ?? null;
}

export interface PledgeUpdateInput {
  vision_text: string;
  plan_text: string;
  importance: number;
  pledge_name: string;
  /** When true and the pledge isn't already signed, stamps pledge_signed_at now. Once signed, stays signed. */
  sign: boolean;
}

export async function upsertPayoffPledge(userId: string, input: PledgeUpdateInput): Promise<PayoffPledge> {
  const supabase = await createClient();
  const existing = await getPayoffPledge(userId);
  const signedAt = existing?.pledge_signed_at ?? (input.sign ? new Date().toISOString() : null);

  const { data, error } = await supabase
    .from('payoff_pledges')
    .upsert(
      {
        user_id: userId,
        vision_text: input.vision_text,
        plan_text: input.plan_text,
        importance: input.importance,
        pledge_name: input.pledge_name,
        pledge_signed_at: signedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to save pledge: ${error.message}`);
  return data as PayoffPledge;
}

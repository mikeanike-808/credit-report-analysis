import { createClient } from '@/lib/supabase/server';
import type { DisputeRecord, DisputeStatus } from '@/types';

export interface CreateDisputeInput {
  user_id: string;
  creditor: string;
  account_number: string;
  bureau_key: string;
  dispute_category: string;
  send_method: 'auto' | 'manual';
  sent_at: string;
  lob_letter_id?: string;
  lob_tracking_number?: string;
  expected_response_by: string;
}

export async function createDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('disputes')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create dispute: ${error.message}`);
  return data as DisputeRecord;
}

export async function getDisputesByUser(userId: string): Promise<DisputeRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch disputes: ${error.message}`);
  return (data ?? []) as DisputeRecord[];
}

export async function updateDisputeStatus(id: string, status: DisputeStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('disputes')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`Failed to update dispute: ${error.message}`);
}

/** Returns sent_at + 30 days as an ISO string */
export function calcExpectedResponseBy(sentAt: string): string {
  const d = new Date(sentAt);
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

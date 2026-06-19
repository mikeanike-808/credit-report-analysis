import { createClient } from '@/lib/supabase/server';
import type { Bite, DisputeRecord, DisputeStatus } from '@/types';

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
  bite_id?: string;
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

/** Creates a new Bite (a batch of letters sent together) with letter_count starting at 0. */
export async function createBite(userId: string): Promise<Bite> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bites')
    .insert({ user_id: userId, letter_count: 0 })
    .select()
    .single();

  if (error) throw new Error(`Failed to create bite: ${error.message}`);
  return data as Bite;
}

/** Increments a Bite's letter_count by one -- called each time a dispute is attached to it. */
export async function incrementBiteLetterCount(biteId: string): Promise<void> {
  const supabase = await createClient();
  const { data: bite, error: fetchError } = await supabase
    .from('bites')
    .select('letter_count')
    .eq('id', biteId)
    .single();
  if (fetchError) throw new Error(`Failed to read bite: ${fetchError.message}`);

  const { error: updateError } = await supabase
    .from('bites')
    .update({ letter_count: (bite as { letter_count: number }).letter_count + 1 })
    .eq('id', biteId);
  if (updateError) throw new Error(`Failed to increment bite letter count: ${updateError.message}`);
}

/**
 * All of a user's Bites, newest first, each with its nested disputes for the
 * Letter Tracking page. Excludes Bites with zero letters -- these are
 * abandoned attempts (e.g. the user started "Mark as Sent" but the request
 * failed before a letter actually attached) and have nothing useful to show.
 */
export async function getBitesByUser(userId: string): Promise<Bite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bites')
    .select('*, disputes(*)')
    .eq('user_id', userId)
    .gt('letter_count', 0)
    .order('sent_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch bites: ${error.message}`);
  return (data ?? []) as Bite[];
}

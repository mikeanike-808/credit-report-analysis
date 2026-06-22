import { createClient } from '@/lib/supabase/server';
import type { AppNotification, NotificationType } from '@/types';

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
  return (data ?? []) as AppNotification[];
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Called from server-side mutation points (letter mailed, new report saved). Never exposed for arbitrary client-triggered creation. */
export async function createNotification(userId: string, input: CreateNotificationInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type: input.type, title: input.title, body: input.body, link: input.link ?? null });

  if (error) throw new Error(`Failed to create notification: ${error.message}`);
}

/**
 * Creates a 'round_ready' notification only if one doesn't already exist
 * for this dispute cycle (created after `cycleStartedAt`) -- since this is
 * triggered passively from the client every time the top bar renders while
 * the 45-day wait is over, without this dedupe check it would spam a new
 * row on every page load.
 */
export async function createRoundReadyNotificationIfNeeded(userId: string, cycleStartedAt: string): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'round_ready')
    .gte('created_at', cycleStartedAt)
    .limit(1)
    .maybeSingle();

  if (fetchError) throw new Error(`Failed to check existing round-ready notification: ${fetchError.message}`);
  if (existing) return;

  await createNotification(userId, {
    type: 'round_ready',
    title: 'Your next dispute round is ready',
    body: "It's been 45 days since your last batch was mailed — time to pull a fresh report and re-dispute anything still on file.",
    link: '/dispute-letters',
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw new Error(`Failed to mark notifications read: ${error.message}`);
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to mark notification read: ${error.message}`);
}

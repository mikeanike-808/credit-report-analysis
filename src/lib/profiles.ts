import { createClient } from '@/lib/supabase/server';
import type { Profile, ProfileAddress } from '@/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
  return (data as Profile | null) ?? null;
}

export async function upsertProfile(userId: string, dob: string, phone: string, address: ProfileAddress): Promise<Profile> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, dob, phone, address, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to save profile: ${error.message}`);
  return data as Profile;
}

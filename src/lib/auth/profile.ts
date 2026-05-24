import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  fullName: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: email.trim(),
      full_name: fullName.trim(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (readError || !profile) {
    return { ok: false, error: readError?.message ?? 'Profile was not created.' };
  }

  return { ok: true };
}

export async function profileExists(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  return Boolean(data?.id);
}

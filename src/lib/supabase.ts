import { createClient } from '@supabase/supabase-js'

// Publishable key: safe to ship in the browser. Access is enforced by row level security.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://eblyucklornvjollzfha.supabase.co'
const key = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_w5k9jrPTU1PHLDULvkMSPQ_rsfp4lsV'

export const supabase = createClient(url, key)

// Which sign-in providers are switched on in Supabase (so we only show working buttons)
export async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    const body = await res.json()
    return !!body?.external?.google
  } catch {
    return false
  }
}

export const PHOTO_BUCKET = 'item-photos'

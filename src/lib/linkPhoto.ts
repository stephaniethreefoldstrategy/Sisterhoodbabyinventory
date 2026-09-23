import { supabase } from './supabase'

// Asks the link-photo function to grab the product image from a shop page
// and store it as an item photo. Returns the storage path, or null if none found.
export async function photoFromLink(url: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('link-photo', { body: { url } })
  if (error || !data?.photo_path) return null
  return data.photo_path as string
}

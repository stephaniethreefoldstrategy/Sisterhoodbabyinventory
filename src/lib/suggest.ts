import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface Suggestion {
  name: string
  category: string
  description: string
  product_link: string | null
  confidence: 'high' | 'medium' | 'low'
}

type Failure = { error: string; disabled?: boolean }

// Asks the suggest-item function to identify the photo and find a product link
export async function suggestFromPhoto(photoPath: string): Promise<Suggestion | Failure> {
  const { data, error } = await supabase.functions.invoke('suggest-item', { body: { photo_path: photoPath } })
  if (!error) return data as Suggestion
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status
    const body = await error.context.json().catch(() => ({}))
    // 503 = the feature isn't switched on yet; stay quiet
    return { error: body.error ?? "Couldn't suggest details for this photo.", disabled: status === 503 }
  }
  return { error: "Couldn't suggest details for this photo." }
}

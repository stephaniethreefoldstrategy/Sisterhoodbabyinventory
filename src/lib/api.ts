import { supabase } from './supabase'
import type { Item, ItemPatch } from '../types'

export async function updateItem(id: string, patch: ItemPatch) {
  const { error } = await supabase.from('items').update(patch).eq('id', id)
  if (error) throw error
}

export async function insertItem(values: ItemPatch & { name: string; created_by: string }): Promise<Item> {
  const { data, error } = await supabase.from('items').insert(values).select().single()
  if (error) throw error
  return data as Item
}

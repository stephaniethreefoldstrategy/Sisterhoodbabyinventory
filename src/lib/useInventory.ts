import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { signPhotos } from './photos'
import type { Item, ItemEvent, Member } from '../types'

export function useInventory(enabled: boolean) {
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [events, setEvents] = useState<ItemEvent[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [m, i, e] = await Promise.all([
      supabase.from('members').select('*').order('created_at'),
      supabase.from('items').select('*').order('created_at', { ascending: false }),
      supabase.from('item_events').select('*').order('created_at', { ascending: false }).limit(300),
    ])
    const err = m.error ?? i.error ?? e.error
    if (err) {
      setError(err.message)
    } else {
      setError(null)
      setMembers(m.data as Member[])
      setItems(i.data as Item[])
      setEvents(e.data as ItemEvent[])
      const paths = (i.data as Item[]).map((x) => x.photo_path).filter((p): p is string => !!p)
      if (paths.length) setPhotos(await signPhotos(paths))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled) return
    reload()
    // Live updates when someone else changes something
    let timer: number | undefined
    const soon = () => {
      clearTimeout(timer)
      timer = window.setTimeout(reload, 300)
    }
    const channel = supabase
      .channel('inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, soon)
      .subscribe()
    window.addEventListener('focus', soon)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', soon)
      supabase.removeChannel(channel)
    }
  }, [enabled, reload])

  return { members, items, events, photos, loading, error, reload }
}

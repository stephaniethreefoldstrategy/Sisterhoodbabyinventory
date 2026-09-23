import { useEffect, useState } from 'react'
import type { Item, SortKey } from '../types'

export interface FilterState {
  categories: string[]
  owners: string[]
  holders: string[]
  photoOnly: boolean
  sort: SortKey
}

export const EMPTY_FILTERS: FilterState = { categories: [], owners: [], holders: [], photoOnly: false, sort: 'newest' }

const STORE_KEY = 'sisterhood-filters'

// Remember each person's filters on their own device
export function useStoredFilters() {
  const [filters, setFilters] = useState<FilterState>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY)
      return saved ? { ...EMPTY_FILTERS, ...JSON.parse(saved) } : EMPTY_FILTERS
    } catch {
      return EMPTY_FILTERS
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(filters))
    } catch {
      // storage unavailable (private mode): filters just won't persist
    }
  }, [filters])
  return [filters, setFilters] as const
}

export const activeCount = (f: FilterState) =>
  f.categories.length + f.owners.length + f.holders.length + (f.photoOnly ? 1 : 0) + (f.sort !== 'newest' ? 1 : 0)

export function applyFilters(items: Item[], f: FilterState, ignoreCategory = false): Item[] {
  const out = items.filter((i) => {
    if (!ignoreCategory && f.categories.length && !f.categories.includes(i.category)) return false
    if (f.owners.length && !f.owners.includes(i.owner_id ?? '')) return false
    if (f.holders.length && !f.holders.includes(i.holder_id ?? '')) return false
    if (f.photoOnly && !i.photo_path) return false
    return true
  })
  if (f.sort === 'az') out.sort((a, b) => a.name.localeCompare(b.name))
  else if (f.sort === 'updated') out.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  else out.sort((a, b) => b.created_at.localeCompare(a.created_at))
  return out
}

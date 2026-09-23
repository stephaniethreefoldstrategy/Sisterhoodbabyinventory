import { useState } from 'react'
import { CATEGORIES, type Item, type Member, type SortKey } from '../types'
import { EMPTY_FILTERS, activeCount, type FilterState } from '../lib/filters'
import { STATUS_LABEL, type Status } from '../lib/status'

const STATUSES: Status[] = ['available', 'on-loan', 'unavailable']
import { Avatar } from './Clover'

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'updated', label: 'Recently changed' },
  { key: 'az', label: 'A–Z' },
]

interface Props {
  filters: FilterState
  setFilters: (f: FilterState) => void
  search: string
  setSearch: (s: string) => void
  members: Member[]
  me: Member
  // Items in this tab after every filter except category, for the category counts
  categoryBase: Item[]
  shown: number
  total: number
}

export function Filters({ filters, setFilters, search, setSearch, members, me, categoryBase, shown, total }: Props) {
  const [open, setOpen] = useState(false)
  const n = activeCount(filters)
  const counts = new Map<string, number>()
  for (const i of categoryBase) counts.set(i.category, (counts.get(i.category) ?? 0) + 1)
  const set = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch })

  const personChips = (key: 'owners' | 'holders') => (
    <div className="chips">
      {members.map((m) => (
        <button
          key={m.id}
          className={`pf ${filters[key].includes(m.id) ? 'on' : ''}`}
          aria-pressed={filters[key].includes(m.id)}
          onClick={() => set({ [key]: toggle(filters[key], m.id) })}
        >
          <Avatar member={m} size={26} />
          <span>{m.id === me.id ? 'Me' : m.display_name}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="filters">
      <div className="search-row">
        <input className="search" type="search" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={`btn ghost filter-btn ${open ? 'on' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
          Filters{n > 0 && <span className="count">{n}</span>}
        </button>
      </div>

      <div className="cat-row" role="group" aria-label="Category">
        <button className={`chip ${filters.categories.length === 0 ? 'on' : ''}`} onClick={() => set({ categories: [] })}>
          All <span className="n">{categoryBase.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${filters.categories.includes(c) ? 'on' : ''} ${counts.get(c) ? '' : 'zero'}`}
            aria-pressed={filters.categories.includes(c)}
            onClick={() => set({ categories: toggle(filters.categories, c) })}
          >
            {c} <span className="n">{counts.get(c) ?? 0}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="filter-panel">
          <div>
            <p className="eyebrow">Status</p>
            <div className="chips">
              {STATUSES.map((st) => (
                <button key={st} className={`chip ${filters.statuses.includes(st) ? 'on' : ''}`} aria-pressed={filters.statuses.includes(st)} onClick={() => set({ statuses: toggle(filters.statuses, st) })}>
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow">Owned by</p>
            {personChips('owners')}
          </div>
          <div>
            <p className="eyebrow">Currently with</p>
            {personChips('holders')}
          </div>
          <div>
            <p className="eyebrow">Show</p>
            <div className="chips">
              <button className={`chip ${filters.photoOnly ? 'on' : ''}`} aria-pressed={filters.photoOnly} onClick={() => set({ photoOnly: !filters.photoOnly })}>
                Only items with photos
              </button>
            </div>
          </div>
          <div>
            <p className="eyebrow">Sort by</p>
            <div className="chips">
              {SORTS.map((s) => (
                <button key={s.key} className={`chip ${filters.sort === s.key ? 'on' : ''}`} aria-pressed={filters.sort === s.key} onClick={() => set({ sort: s.key })}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(n > 0 || search) && (
        <p className="result-line">
          Showing {shown} of {total}
          <button className="link-btn" onClick={() => { setFilters(EMPTY_FILTERS); setSearch('') }}>
            Clear all
          </button>
        </p>
      )}
    </div>
  )
}

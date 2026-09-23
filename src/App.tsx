import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { useInventory } from './lib/useInventory'
import { insertItem, updateItem } from './lib/api'
import { EDITABLE_FIELDS, snapshot, type Item, type ItemEvent, type ItemPatch, type Member } from './types'
import { Login, NotInvited } from './components/Login'
import { Avatar, Clover, PersonChip } from './components/Clover'
import { ItemForm } from './components/ItemForm'
import { ItemDetail } from './components/ItemDetail'
import { Activity } from './components/Activity'
import { People } from './components/People'
import { Filters } from './components/Filters'
import { applyFilters, useStoredFilters } from './lib/filters'

type View = 'all' | 'available' | 'borrowed' | 'archive' | 'activity' | 'people'

const TABS: { key: View; label: string }[] = [
  { key: 'all', label: 'Everything' },
  { key: 'available', label: 'Free to borrow' },
  { key: 'borrowed', label: 'On loan' },
  { key: 'archive', label: 'Archive' },
  { key: 'activity', label: 'Activity' },
  { key: 'people', label: 'People' },
]

interface UndoEntry {
  id: number
  label: string
  undo: () => Promise<void>
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (!session) return <Login />
  return <Inventory session={session} />
}

function Splash() {
  return (
    <main className="login">
      <Clover fill="#FFD6EB" size={56} className="pulse" />
    </main>
  )
}

function Inventory({ session }: { session: Session }) {
  const { members, items, events, photos, loading, error, reload } = useInventory(true)
  const email = session.user.email?.toLowerCase()
  const me = members.find((m) => m.email === email)

  const [view, setView] = useState<View>('all')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useStoredFilters()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [undos, setUndos] = useState<UndoEntry[]>([])
  const [toastVisible, setToastVisible] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const nextId = useRef(1)

  const pushUndo = useCallback((label: string, undo: () => Promise<void>) => {
    setUndos((u) => [{ id: nextId.current++, label, undo }, ...u].slice(0, 20))
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 8000)
  }, [])

  const flash = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 4000)
  }

  const runUndo = useCallback(async () => {
    const [top, ...rest] = undos
    if (!top) return
    setUndos(rest)
    setToastVisible(false)
    try {
      await top.undo()
      await reload()
      flash(`Undone: ${top.label}`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not undo')
    }
  }, [undos, reload])

  // Ctrl/Cmd+Z undoes your last change (when not typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, select')
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        runUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runUndo])

  const changeItem = async (item: Item, patch: ItemPatch, label: string) => {
    const before = snapshot(item)
    await updateItem(item.id, patch)
    pushUndo(label, () => updateItem(item.id, before))
    await reload()
  }

  const createItem = async (values: ItemPatch & { name: string }) => {
    const created = await insertItem({ ...values, created_by: me!.id })
    pushUndo(`${created.name} added`, () => updateItem(created.id, { deleted_at: new Date().toISOString() }))
    await reload()
  }

  // Undo any logged change by writing back what the item looked like before it
  const undoEvent = async (ev: ItemEvent) => {
    const item = items.find((i) => i.id === ev.item_id)
    if (!item) return
    const target: ItemPatch =
      ev.action === 'created'
        ? { deleted_at: new Date().toISOString() }
        : (Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, ev.before?.[f] ?? null])) as ItemPatch)
    if (target.archived === null) target.archived = false
    if (target.name === null) target.name = item.name
    if (target.description === null) target.description = ''
    if (!target.category) target.category = 'Other'
    try {
      await changeItem(item, target, `undo on ${item.name}`)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Could not undo')
    }
  }

  // Items in the current tab matching the search, before the filter panel is applied
  const inView = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (i.deleted_at && view !== 'archive') return false
      if (view === 'archive' && !i.archived && !i.deleted_at) return false
      if (view !== 'archive' && i.archived) return false
      if (view === 'available' && i.holder_id !== i.owner_id) return false
      if (view === 'borrowed' && i.holder_id === i.owner_id) return false
      if (q && !`${i.name} ${i.description} ${i.category}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, view, search])
  const visible = useMemo(() => applyFilters(inView, filters), [inView, filters])
  const categoryBase = useMemo(() => applyFilters(inView, filters, true), [inView, filters])

  if (loading) return <Splash />
  if (error) return <main className="login"><p className="error">{error}</p></main>
  if (!me) return <NotInvited email={session.user.email} />

  const opened = items.find((i) => i.id === openId)
  const showGrid = view !== 'activity' && view !== 'people'
  const byId = (id: string | null) => members.find((m) => m.id === id)

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <Clover fill="#5F1D3E" size={30} />
          <div>
            <h1 className="display">Sisterhood</h1>
            <p className="display sub">Baby Inventory</p>
          </div>
        </div>
        <button className="me" onClick={() => setView('people')} aria-label="People and settings">
          <Avatar member={me} size={36} />
        </button>
      </header>

      <nav className="tabs" aria-label="Views">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${view === t.key ? 'on' : ''}`} onClick={() => setView(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {showGrid && (
        <Filters
          filters={filters}
          setFilters={setFilters}
          search={search}
          setSearch={setSearch}
          members={members}
          me={me}
          categoryBase={categoryBase}
          shown={visible.length}
          total={inView.length}
        />
      )}

      <main className="content">
        {showGrid && (
          visible.length ? (
            <ul className="grid">
              {visible.map((i) => (
                <ItemCard key={i.id} item={i} owner={byId(i.owner_id)} holder={byId(i.holder_id)} photo={i.photo_path ? photos[i.photo_path] : undefined} onOpen={() => setOpenId(i.id)} />
              ))}
            </ul>
          ) : (
            <div className="empty">
              <Clover fill="#FFF5B4" size={56} />
              <p>{items.length ? 'Nothing matches here.' : 'No items yet. Add the first one!'}</p>
            </div>
          )
        )}
        {view === 'activity' && <Activity events={events} items={items} members={members} onOpen={setOpenId} onUndo={undoEvent} />}
        {view === 'people' && <People me={me} members={members} items={items} onChanged={reload} />}
      </main>

      {showGrid && view !== 'archive' && (
        <button className="fab" onClick={() => setEditing('new')}>
          + Add item
        </button>
      )}

      {opened && !editing && (
        <ItemDetail
          item={opened}
          me={me}
          members={members}
          events={events}
          photoUrl={opened.photo_path ? photos[opened.photo_path] : undefined}
          onChange={(patch, label) => changeItem(opened, patch, label)}
          onUndoEvent={undoEvent}
          onEdit={() => setEditing(opened)}
          onClose={() => setOpenId(null)}
        />
      )}

      {editing && (
        <ItemForm
          item={editing === 'new' ? undefined : editing}
          me={me}
          members={members}
          photoUrl={editing !== 'new' && editing.photo_path ? photos[editing.photo_path] : undefined}
          onSave={(values) => (editing === 'new' ? createItem(values) : changeItem(editing, values, `${values.name} updated`))}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="toast-zone" aria-live="polite">
        {toastVisible && undos[0] && (
          <div className="toast">
            <span>{undos[0].label}</span>
            <button onClick={runUndo}>Undo</button>
          </div>
        )}
        {!toastVisible && notice && <div className="toast">{notice}</div>}
      </div>
    </div>
  )
}

function ItemCard({ item, owner, holder, photo, onOpen }: { item: Item; owner?: Member; holder?: Member; photo?: string; onOpen: () => void }) {
  const status = item.deleted_at ? 'Deleted' : item.archived ? 'Archived' : item.holder_id === item.owner_id ? 'Available' : 'On loan'
  return (
    <li>
      <button className="card" onClick={onOpen}>
        <div className="card-photo">
          {photo ? <img src={photo} alt="" loading="lazy" /> : <Clover fill="#FFD6EB" size={56} />}
          <span className={`badge ${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
        </div>
        <div className="card-body">
          <span className="cat-tag">{item.category}</span>
          <h3>{item.name}</h3>
          <PersonChip member={owner} prefix="Owner" />
          {item.holder_id !== item.owner_id && <PersonChip member={holder} prefix="With" />}
        </div>
      </button>
    </li>
  )
}

import type { Item, ItemEvent, Member } from '../types'
import { describeEvent, timeAgo } from '../lib/describe'
import { Avatar } from './Clover'

interface Props {
  events: ItemEvent[]
  items: Item[]
  members: Member[]
  onOpen: (id: string) => void
  onUndo: (ev: ItemEvent) => Promise<void>
}

export function Activity({ events, items, members, onOpen, onUndo }: Props) {
  // Only the newest change on each item can be undone, so undos never clash
  const latest = new Set<number>()
  const seen = new Set<string>()
  for (const ev of events) {
    if (!seen.has(ev.item_id)) {
      seen.add(ev.item_id)
      latest.add(ev.id)
    }
  }

  if (!events.length) return <p className="empty">Nothing has happened yet.</p>

  return (
    <ol className="history activity">
      {events.map((ev) => {
        const actor = members.find((m) => m.id === ev.actor_id)
        const item = items.find((i) => i.id === ev.item_id)
        const text = describeEvent(ev, members)
        const at = text.search(/\bit\b/)
        return (
          <li key={ev.id}>
            <Avatar member={actor} size={28} />
            <span>
              <strong>{actor?.display_name ?? 'Someone'}</strong> {text.slice(0, at)}
              <button className="inline-link" onClick={() => onOpen(ev.item_id)}>
                {item?.name ?? ev.after?.name ?? 'an item'}
              </button>
              {text.slice(at + 2)}
              <span className="muted"> · {timeAgo(ev.created_at)}</span>
            </span>
            {latest.has(ev.id) && (
              <button className="link-btn" onClick={() => onUndo(ev)}>
                Undo
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}

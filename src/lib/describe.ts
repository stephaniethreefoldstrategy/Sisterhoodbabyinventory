import type { ItemEvent, Member } from '../types'
import { holderLabel } from './status'

const nameOf = (members: Member[], id: string | null | undefined) =>
  members.find((m) => m.id === id)?.display_name ?? 'someone'

export function describeEvent(ev: ItemEvent, members: Member[]): string {
  const b = ev.before
  const a = ev.after
  switch (ev.action) {
    case 'created':
      return 'added it'
    case 'handed_over':
      return `passed it from ${b ? holderLabel(b, members) : 'someone'} to ${a ? holderLabel(a, members) : 'someone'}`
    case 'made_available':
      return 'marked it available'
    case 'made_unavailable':
      return a?.availability_note ? `marked it not available (${a.availability_note.toLowerCase()})` : 'marked it not available'
    case 'archived':
      return a?.archive_reason ? `archived it (${a.archive_reason.toLowerCase()})` : 'archived it'
    case 'unarchived':
      return 'brought it back from the archive'
    case 'deleted':
      return 'deleted it'
    case 'undeleted':
      return 'restored it'
    default: {
      const changed: string[] = []
      if (b && a) {
        if (b.name !== a.name) changed.push('name')
        if (b.category !== a.category) changed.push(`category (now ${a.category})`)
        if (b.description !== a.description) changed.push('description')
        if (b.product_link !== a.product_link) changed.push('link')
        if (b.photo_path !== a.photo_path) changed.push('photo')
        if (b.availability_note !== a.availability_note) changed.push('availability note')
        if (b.owner_id !== a.owner_id) changed.push(`owner (now ${nameOf(members, a.owner_id)})`)
      }
      return changed.length ? `changed the ${changed.join(', ')} on it` : 'edited it'
    }
  }
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

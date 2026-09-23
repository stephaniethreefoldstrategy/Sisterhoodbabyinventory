import type { Item, Member } from '../types'

export type Status = 'available' | 'on-loan' | 'unavailable' | 'archived' | 'deleted'

export const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  'on-loan': 'On loan',
  unavailable: 'Not available',
  archived: 'Archived',
  deleted: 'Deleted',
}

// With someone other than the owner: another sister, or a name typed in by hand
export const isLent = (i: Item) => !!i.holder_name || i.holder_id !== i.owner_id

export function statusOf(i: Item): Status {
  if (i.deleted_at) return 'deleted'
  if (i.archived) return 'archived'
  if (isLent(i)) return 'on-loan'
  if (!i.available) return 'unavailable'
  return 'available'
}

export function holderLabel(i: Pick<Item, 'holder_id' | 'holder_name'>, members: Member[]): string {
  if (i.holder_name) return i.holder_name
  return members.find((m) => m.id === i.holder_id)?.display_name ?? 'Nobody'
}

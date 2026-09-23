import type { Item, Loan, Member } from '../types'

export type Status = 'available' | 'on-loan' | 'unavailable' | 'archived' | 'deleted'

export const STATUS_LABEL: Record<Status, string> = {
  available: 'Available',
  'on-loan': 'On loan',
  unavailable: 'Not available',
  archived: 'Archived',
  deleted: 'Deleted',
}

// Items with a quantity above 1 are tracked as loans; single items use holder_id/holder_name
export const isMulti = (i: Pick<Item, 'quantity'>) => (i.quantity ?? 1) > 1
export const loansOf = (i: Pick<Item, 'loans'>): Loan[] => (Array.isArray(i.loans) ? i.loans : [])
export const lentCount = (i: Pick<Item, 'loans'>) => loansOf(i).reduce((n, l) => n + l.qty, 0)

// With someone other than the owner: another sister, or a name typed in by hand
export const isLent = (i: Item) =>
  isMulti(i) ? lentCount(i) > 0 : !!i.holder_name || i.holder_id !== i.owner_id

// How many are still with the owner
export const remaining = (i: Item) => (isMulti(i) ? Math.max(0, i.quantity - lentCount(i)) : isLent(i) ? 0 : 1)

export function statusOf(i: Item): Status {
  if (i.deleted_at) return 'deleted'
  if (i.archived) return 'archived'
  if (remaining(i) === 0) return 'on-loan'
  if (!i.available) return 'unavailable'
  return 'available'
}

export function statusLabel(i: Item): string {
  const s = statusOf(i)
  if (isMulti(i) && s === 'available' && lentCount(i) > 0) return `${remaining(i)} of ${i.quantity} available`
  return STATUS_LABEL[s]
}

export function holderLabel(i: Pick<Item, 'holder_id' | 'holder_name'>, members: Member[]): string {
  if (i.holder_name) return i.holder_name
  return members.find((m) => m.id === i.holder_id)?.display_name ?? 'Nobody'
}

export const loanLabel = (l: Loan, members: Member[]) =>
  l.name ?? members.find((m) => m.id === l.member_id)?.display_name ?? 'someone'

export const sameBorrower = (a: Pick<Loan, 'member_id' | 'name'>, b: Pick<Loan, 'member_id' | 'name'>) =>
  a.member_id ? a.member_id === b.member_id : !b.member_id && (a.name ?? '').toLowerCase() === (b.name ?? '').toLowerCase()

// Add qty to a borrower's share (merging with anything they already have)
export function addLoan(loans: Loan[], who: Pick<Loan, 'member_id' | 'name'>, qty: number): Loan[] {
  const existing = loans.find((l) => sameBorrower(l, who))
  if (existing) return loans.map((l) => (l === existing ? { ...l, qty: l.qty + qty } : l))
  return [...loans, { member_id: who.member_id, name: who.name, qty }]
}

// Take qty back from a borrower's share (removing them when it hits zero)
export function returnLoan(loans: Loan[], who: Loan, qty: number): Loan[] {
  return loans.flatMap((l) => (sameBorrower(l, who) ? (l.qty - qty > 0 ? [{ ...l, qty: l.qty - qty }] : []) : [l]))
}

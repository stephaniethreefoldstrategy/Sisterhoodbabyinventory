import { useState } from 'react'
import { ARCHIVE_REASONS, type Item, type ItemEvent, type ItemPatch, type Member } from '../types'
import { describeEvent, timeAgo } from '../lib/describe'
import { Avatar, Clover, PersonChip } from './Clover'
import { Modal } from './Modal'

interface Props {
  item: Item
  me: Member
  members: Member[]
  events: ItemEvent[]
  photoUrl?: string
  onChange: (patch: ItemPatch, label: string) => Promise<void>
  onUndoEvent: (ev: ItemEvent) => Promise<void>
  onEdit: () => void
  onClose: () => void
}

export function ItemDetail({ item, me, members, events, photoUrl, onChange, onUndoEvent, onEdit, onClose }: Props) {
  const [archiving, setArchiving] = useState(false)
  const [busy, setBusy] = useState(false)
  const owner = members.find((m) => m.id === item.owner_id)
  const holder = members.find((m) => m.id === item.holder_id)
  const history = events.filter((e) => e.item_id === item.id)

  const run = async (patch: ItemPatch, label: string) => {
    setBusy(true)
    try {
      await onChange(patch, label)
    } finally {
      setBusy(false)
      setArchiving(false)
    }
  }

  const passTo = (id: string) => {
    const m = members.find((x) => x.id === id)
    if (m && id !== item.holder_id) run({ holder_id: id }, `${item.name} is now with ${m.display_name}`)
  }

  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="detail">
        <div className="detail-photo">
          {photoUrl ? <img src={photoUrl} alt={item.name} /> : <Clover fill="#FFD6EB" size={96} />}
        </div>

        {item.deleted_at && <p className="banner">This item was deleted.</p>}
        {item.archived && !item.deleted_at && (
          <p className="banner">Archived{item.archive_reason ? `: ${item.archive_reason}` : ''}</p>
        )}

        <span className="cat-tag">{item.category}</span>
        {item.description && <p className="desc">{item.description}</p>}
        {item.product_link && (
          <a className="product-link" href={item.product_link} target="_blank" rel="noreferrer">
            View product ↗
          </a>
        )}

        <div className="who">
          <div>
            <span className="eyebrow">Owner</span>
            <PersonChip member={owner} />
          </div>
          <div>
            <span className="eyebrow">Currently with</span>
            <PersonChip member={holder} />
          </div>
        </div>

        {item.deleted_at ? (
          <button className="btn primary wide" disabled={busy} onClick={() => run({ deleted_at: null }, `${item.name} restored`)}>
            Restore item
          </button>
        ) : item.archived ? (
          <div className="actions">
            <button className="btn primary" disabled={busy} onClick={() => run({ archived: false, archive_reason: null }, `${item.name} is back in the inventory`)}>
              Bring back from archive
            </button>
            <button className="btn danger" disabled={busy} onClick={() => run({ deleted_at: new Date().toISOString() }, `${item.name} deleted`)}>
              Delete for good
            </button>
          </div>
        ) : (
          <>
            <div className="actions">
              {item.holder_id !== me.id && (
                <button className="btn primary" disabled={busy} onClick={() => passTo(me.id)}>
                  I've got it now
                </button>
              )}
              {item.holder_id !== item.owner_id && item.owner_id && (
                <button className="btn" disabled={busy} onClick={() => passTo(item.owner_id!)}>
                  Returned to {owner?.display_name ?? 'owner'}
                </button>
              )}
              <label className="pass-to">
                <span className="sr-only">Pass to</span>
                <select value="" disabled={busy} onChange={(e) => passTo(e.target.value)}>
                  <option value="" disabled>Pass to…</option>
                  {members.filter((m) => m.id !== item.holder_id).map((m) => (
                    <option key={m.id} value={m.id}>{m.display_name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="actions secondary">
              <button className="btn ghost" onClick={onEdit}>Edit</button>
              <button className="btn ghost" onClick={() => setArchiving((v) => !v)}>Archive</button>
            </div>
            {archiving && (
              <div className="archive-pick">
                <p className="eyebrow">Why is it going in the archive?</p>
                <div className="chips">
                  {ARCHIVE_REASONS.map((r) => (
                    <button key={r} className="chip" disabled={busy} onClick={() => run({ archived: true, archive_reason: r }, `${item.name} archived`)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <h3 className="eyebrow history-title">History</h3>
        <ol className="history">
          {history.map((ev, i) => {
            const actor = members.find((m) => m.id === ev.actor_id)
            return (
              <li key={ev.id}>
                <Avatar member={actor} size={22} />
                <span>
                  <strong>{actor?.display_name ?? 'Someone'}</strong> {describeEvent(ev, members)}
                  <span className="muted"> · {timeAgo(ev.created_at)}</span>
                </span>
                {i === 0 && (
                  <button className="link-btn" disabled={busy} onClick={() => onUndoEvent(ev)}>
                    Undo
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </Modal>
  )
}

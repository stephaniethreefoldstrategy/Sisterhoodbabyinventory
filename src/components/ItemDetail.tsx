import { useState } from 'react'
import { ARCHIVE_REASONS, UNAVAILABLE_REASONS, type Item, type Loan, type ItemEvent, type ItemPatch, type Member } from '../types'
import { describeEvent, timeAgo } from '../lib/describe'
import { addLoan, isLent, isMulti, loanLabel, loansOf, remaining, returnLoan, statusLabel, statusOf } from '../lib/status'
import { Avatar, Clover, NameChip, PersonChip } from './Clover'
import { Modal } from './Modal'
import { photoFromLink } from '../lib/linkPhoto'

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

type Panel = null | 'archive' | 'someone' | 'unavailable' | 'lend'

export function ItemDetail({ item, me, members, events, photoUrl, onChange, onUndoEvent, onEdit, onClose }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  const [outsideName, setOutsideName] = useState('')
  const [note, setNote] = useState('')
  const [linkPhoto, setLinkPhoto] = useState<'idle' | 'loading' | 'failed'>('idle')

  const fetchPhotoFromLink = async () => {
    if (!item.product_link) return
    setLinkPhoto('loading')
    const path = await photoFromLink(item.product_link)
    if (!path) return setLinkPhoto('failed')
    await run({ photo_path: path }, `Photo added to ${item.name}`)
    setLinkPhoto('idle')
  }
  const owner = members.find((m) => m.id === item.owner_id)
  const holder = members.find((m) => m.id === item.holder_id)
  const history = events.filter((e) => e.item_id === item.id)
  const status = statusOf(item)
  const multi = isMulti(item)
  const left = remaining(item)
  const [lendTo, setLendTo] = useState(members.find((m) => m.id !== item.owner_id)?.id ?? '__someone')
  const [lendName, setLendName] = useState('')
  const [lendQty, setLendQty] = useState(1)

  const lend = (e: React.FormEvent) => {
    e.preventDefault()
    const outside = lendTo === '__someone'
    const who = outside ? { member_id: null, name: lendName.trim() } : { member_id: lendTo, name: null }
    const qty = Math.min(Math.max(1, Math.floor(lendQty)), left)
    if ((outside && !who.name) || qty < 1) return
    const label = outside ? who.name : members.find((m) => m.id === lendTo)?.display_name
    run({ loans: addLoan(loansOf(item), who, qty) }, `${qty} × ${item.name} now with ${label}`)
    setLendQty(1)
    setLendName('')
  }

  const giveBack = (l: Loan, qty: number) =>
    run({ loans: returnLoan(loansOf(item), l, qty) }, `${qty} × ${item.name} returned by ${loanLabel(l, members)}`)

  const run = async (patch: ItemPatch, label: string) => {
    setBusy(true)
    try {
      await onChange(patch, label)
    } finally {
      setBusy(false)
      setPanel(null)
    }
  }

  const passTo = (id: string) => {
    if (id === '__someone') return setPanel('someone')
    const m = members.find((x) => x.id === id)
    if (m && (id !== item.holder_id || item.holder_name)) run({ holder_id: id, holder_name: null }, `${item.name} is now with ${m.display_name}`)
  }

  const passToOutside = (e: React.FormEvent) => {
    e.preventDefault()
    const n = outsideName.trim()
    if (n) run({ holder_id: null, holder_name: n }, `${item.name} is now with ${n}`)
    setOutsideName('')
  }

  const markUnavailable = (reason: string) =>
    run({ available: false, availability_note: reason.trim() || null }, `${item.name} marked not available`)

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p))

  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="detail">
        <div className="detail-photo">
          {photoUrl ? <img src={photoUrl} alt={item.name} /> : <Clover fill="#FFD6EB" size={96} />}
          <span className={`badge ${status}`}>{statusLabel(item)}</span>
          {!item.photo_path && item.product_link && !item.deleted_at && (
            <button className="btn photo-from-link" disabled={linkPhoto === 'loading'} onClick={fetchPhotoFromLink}>
              {linkPhoto === 'loading' ? 'Getting photo…' : linkPhoto === 'failed' ? 'No photo found on that page' : 'Get photo from link'}
            </button>
          )}
        </div>

        {item.deleted_at && <p className="banner">This item was deleted.</p>}
        {item.archived && !item.deleted_at && (
          <p className="banner">Archived{item.archive_reason ? `: ${item.archive_reason}` : ''}</p>
        )}
        {status === 'unavailable' && (
          <p className="banner unavailable">Not available to borrow{item.availability_note ? `: ${item.availability_note}` : ''}</p>
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
          {multi ? (
            <div>
              <span className="eyebrow">Quantity</span>
              <span className="qty-line">{item.quantity} total · {left} with {owner?.display_name ?? 'owner'}</span>
            </div>
          ) : (
            <div>
              <span className="eyebrow">Who has it</span>
              {item.holder_name ? <NameChip name={item.holder_name} /> : <PersonChip member={holder} />}
            </div>
          )}
        </div>

        {multi && loansOf(item).length > 0 && (
          <ul className="loan-list">
            {loansOf(item).map((l) => {
              const member = members.find((m) => m.id === l.member_id)
              return (
                <li key={`${l.member_id ?? ''}${l.name ?? ''}`}>
                  {member ? <PersonChip member={member} /> : <NameChip name={l.name ?? 'Someone'} />}
                  <span className="loan-qty">×{l.qty}</span>
                  {!item.deleted_at && !item.archived && (
                    <span className="loan-actions">
                      {l.qty > 1 && (
                        <button className="link-btn" disabled={busy} onClick={() => giveBack(l, 1)}>Returned 1</button>
                      )}
                      <button className="link-btn" disabled={busy} onClick={() => giveBack(l, l.qty)}>
                        {l.qty > 1 ? 'Returned all' : 'Returned'}
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

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
            {multi ? (
              left > 0 ? (
                panel === 'lend' ? (
                  <form className="inline-panel" onSubmit={lend}>
                    <div className="two-col">
                      <label>
                        Who's taking some?
                        <select value={lendTo} onChange={(e) => setLendTo(e.target.value)}>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>{m.id === me.id ? `Me (${m.display_name})` : m.display_name}</option>
                          ))}
                          <option value="__someone">Someone else…</option>
                        </select>
                      </label>
                      <label>
                        How many? <span className="muted">(max {left})</span>
                        <input type="number" inputMode="numeric" min={1} max={left} value={lendQty} onChange={(e) => setLendQty(Number(e.target.value))} />
                      </label>
                    </div>
                    {lendTo === '__someone' && (
                      <label>
                        Their name
                        <input required value={lendName} onChange={(e) => setLendName(e.target.value)} placeholder="e.g. Mum" />
                      </label>
                    )}
                    <div className="row gap">
                      <button className="btn primary" disabled={busy}>Save</button>
                      <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="btn primary wide" disabled={busy} onClick={() => setPanel('lend')}>
                    Lend some ({left} left)
                  </button>
                )
              ) : (
                <p className="muted small">All {item.quantity} are out on loan.</p>
              )
            ) : (
              <>
                <div className="actions">
                  {(item.holder_id !== me.id || item.holder_name) && (
                    <button className="btn primary" disabled={busy} onClick={() => passTo(me.id)}>
                      I've got it now
                    </button>
                  )}
                  {isLent(item) && item.owner_id && (
                    <button className="btn" disabled={busy} onClick={() => passTo(item.owner_id!)}>
                      Returned to {owner?.display_name ?? 'owner'}
                    </button>
                  )}
                  <label className="pass-to">
                    <span className="sr-only">Pass to</span>
                    <select value="" disabled={busy} onChange={(e) => passTo(e.target.value)}>
                      <option value="" disabled>Pass to…</option>
                      {members.filter((m) => m.id !== item.holder_id || item.holder_name).map((m) => (
                        <option key={m.id} value={m.id}>{m.display_name}</option>
                      ))}
                      <option value="__someone">Someone else (type a name)…</option>
                    </select>
                  </label>
                </div>

                {panel === 'someone' && (
                  <form className="inline-panel" onSubmit={passToOutside}>
                    <label>
                      Who has it?
                      <input autoFocus required value={outsideName} onChange={(e) => setOutsideName(e.target.value)} placeholder="e.g. Mum, Jess from mothers group" />
                    </label>
                    <div className="row gap">
                      <button className="btn primary" disabled={busy || !outsideName.trim()}>Save</button>
                      <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancel</button>
                    </div>
                  </form>
                )}

              </>
            )}

            <div className="avail-toggle" role="group" aria-label="Availability">
              <button
                className={item.available ? 'on' : ''}
                aria-pressed={item.available}
                disabled={busy}
                onClick={() => !item.available && run({ available: true, availability_note: null }, `${item.name} marked available`)}
              >
                Available to borrow
              </button>
              <button
                className={!item.available ? 'on off' : ''}
                aria-pressed={!item.available}
                disabled={busy}
                onClick={() => toggle('unavailable')}
              >
                Not available
              </button>
            </div>

            {panel === 'unavailable' && (
              <div className="inline-panel">
                <p className="eyebrow">Why? (optional)</p>
                <div className="chips">
                  {UNAVAILABLE_REASONS.map((r) => (
                    <button key={r} className="chip" disabled={busy} onClick={() => markUnavailable(r)}>{r}</button>
                  ))}
                </div>
                <form className="row gap" onSubmit={(e) => { e.preventDefault(); markUnavailable(note) }}>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or write your own…" />
                  <button className="btn primary" disabled={busy}>Save</button>
                </form>
              </div>
            )}

            <div className="actions secondary">
              <button className="btn ghost" onClick={onEdit}>Edit</button>
              <button className="btn ghost" onClick={() => toggle('archive')}>Archive</button>
            </div>
            {panel === 'archive' && (
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

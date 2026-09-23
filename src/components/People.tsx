import { useState } from 'react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { COLOURS, type Colour, type Item, type Member } from '../types'
import { Avatar } from './Clover'

const MAX_MEMBERS = 8

interface Props {
  me: Member
  members: Member[]
  items: Item[]
  onChanged: () => void
}

function ColourPicker({ value, onChange }: { value: Colour; onChange: (c: Colour) => void }) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Colour">
      {COLOURS.map((c) => (
        <button
          key={c.key}
          type="button"
          role="radio"
          aria-checked={value === c.key}
          aria-label={c.label}
          title={c.label}
          className={`swatch ${value === c.key ? 'on' : ''}`}
          style={{ background: c.hex }}
          onClick={() => onChange(c.key)}
        />
      ))}
    </div>
  )
}

export function People({ me, members, items, onChanged }: Props) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [colour, setColour] = useState<Colour>('pink')
  const [myName, setMyName] = useState(me.display_name)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const inviteMessage = (c: { name: string; email: string; password: string }) =>
    `Hi ${c.name}! You're in the Sisterhood Baby Inventory 🍀\n${window.location.origin}${window.location.pathname}\nEmail: ${c.email}\nPassword: ${c.password}\n(You can change your password on the People tab.)`

  const copyInvite = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(inviteMessage(created))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwStatus(error ? error.message : 'Password saved.')
    if (!error) setNewPassword('')
  }

  // Creates (or resets) a login and shows the password to pass on by text
  const callInvite = async (body: Record<string, string>, who: string) => {
    setError(null)
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('invite-member', { body })
    setBusy(false)
    if (error || !data?.password) {
      const msg = error instanceof FunctionsHttpError ? (await error.context.json().catch(() => ({}))).error : null
      setError(msg ?? 'Something went wrong, please try again.')
      return false
    }
    setCreated({ name: who, email: data.email, password: data.password })
    onChanged()
    return true
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await callInvite({ action: 'invite', email: email.trim(), name: name.trim(), colour }, name.trim())
    if (ok) {
      setEmail('')
      setName('')
    }
  }

  const updateMe = async (patch: Partial<Member>) => {
    const { error } = await supabase.from('members').update(patch).eq('id', me.id)
    if (error) setError(error.message)
    onChanged()
  }

  const count = (id: string, key: 'owner_id' | 'holder_id') =>
    items.filter((i) => i[key] === id && !i.archived && !i.deleted_at).length

  return (
    <div className="people">
      <ul className="people-list">
        {members.map((m) => (
          <li key={m.id} className="person">
            <Avatar member={m} size={44} />
            <div>
              <strong>{m.display_name}</strong>
              {m.id === me.id && <span className="muted"> (you)</span>}
              <div className="muted small">{m.email}</div>
              <div className="small">
                Owns {count(m.id, 'owner_id')} · Has {count(m.id, 'holder_id')}
              </div>
            </div>
            {m.id !== me.id && (
              <button className="link-btn person-reset" disabled={busy} onClick={() => callInvite({ action: 'reset', member_id: m.id }, m.display_name)}>
                Reset password
              </button>
            )}
          </li>
        ))}
      </ul>

      {created && (
        <section className="panel invite-card" aria-live="polite">
          <h3 className="eyebrow">Send this to {created.name}</h3>
          <pre className="invite-text">{inviteMessage(created)}</pre>
          <div className="row gap">
            <button className="btn primary" onClick={copyInvite}>{copied ? 'Copied ✓' : 'Copy message'}</button>
            <a className="btn ghost" href={`sms:?&body=${encodeURIComponent(inviteMessage(created))}`}>Text it</a>
            <button className="link-btn" onClick={() => setCreated(null)}>Done</button>
          </div>
          <p className="muted tiny">This password is only shown now. If it gets lost, tap Reset password next to their name.</p>
        </section>
      )}

      <section className="panel">
        <h3 className="eyebrow">You</h3>
        <label>
          Your name
          <input value={myName} onChange={(e) => setMyName(e.target.value)} onBlur={() => myName.trim() && myName !== me.display_name && updateMe({ display_name: myName.trim() })} />
        </label>
        <p className="label-text">Your colour</p>
        <ColourPicker value={me.colour} onChange={(c) => updateMe({ colour: c })} />
        <form className="stack" onSubmit={changePassword}>
          <label>
            Change your password
            <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <button className="btn wide">Save password</button>
          {pwStatus && <p className="muted small">{pwStatus}</p>}
        </form>
      </section>

      {members.length < MAX_MEMBERS && (
        <form className="panel stack" onSubmit={add}>
          <h3 className="eyebrow">Invite a sister</h3>
          <p className="muted small">This creates their login straight away. You'll get a message with their email and password to text them. No confirmation emails.</p>
          <label>
            Name
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <p className="label-text">Colour</p>
          <ColourPicker value={colour} onChange={setColour} />
          <button className="btn primary wide" disabled={busy}>{busy ? 'Creating login…' : 'Invite'}</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn ghost wide" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

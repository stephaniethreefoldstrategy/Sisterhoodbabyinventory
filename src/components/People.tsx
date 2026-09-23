import { useState } from 'react'
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

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwStatus(error ? error.message : 'Password saved. You can now sign in with your email and this password.')
    if (!error) setNewPassword('')
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase
      .from('members')
      .insert({ email: email.trim().toLowerCase(), display_name: name.trim(), colour })
    if (error) return setError(error.code === '23505' ? 'That email is already on the list.' : error.message)
    setEmail('')
    setName('')
    onChanged()
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
          </li>
        ))}
      </ul>

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
            {me.email} password
            <input type="password" required minLength={8} autoComplete="new-password" placeholder="Set a new password (8+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <button className="btn wide">Save password</button>
          {pwStatus && <p className="muted small">{pwStatus}</p>}
        </form>
      </section>

      {members.length < MAX_MEMBERS && (
        <form className="panel stack" onSubmit={add}>
          <h3 className="eyebrow">Invite a sister</h3>
          <p className="muted small">Add their email. They can then either tap “Continue with Google” (if it's a Google email) or choose “Create account” and set their own password.</p>
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
          <button className="btn primary wide">Add to the sisterhood</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn ghost wide" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

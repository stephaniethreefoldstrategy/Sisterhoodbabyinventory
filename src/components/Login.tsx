import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clover } from './Clover'


export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: password.trim() })
    if (error) setStatus(error.message === 'Invalid login credentials' ? "That email and password don't match." : error.message)
    setBusy(false)
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-clovers">
          <Clover fill="#FFD6EB" size={34} />
          <Clover fill="#FFF5B4" size={34} />
          <Clover fill="#939E86" size={34} />
          <Clover fill="#CAE4EF" size={34} />
          <Clover fill="#FFA873" size={34} />
        </div>
        <h1 className="display">Sisterhood</h1>
        <p className="display sub">Baby Inventory</p>
        <p className="lede">Who has what, and what can be borrowed.</p>

        <form onSubmit={submit} className="stack">
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn primary wide" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {status && <p className="status" role="status">{status}</p>}
        <p className="status">Invite only. Forgot your password? Ask one of the sisters to reset it for you.</p>
      </div>
    </main>
  )
}

export function NotInvited({ email }: { email: string | undefined }) {
  return (
    <main className="login">
      <div className="login-card">
        <Clover fill="#FFA873" size={48} />
        <h1 className="display">Not on the list yet</h1>
        <p className="lede">
          You're signed in as <strong>{email}</strong>, but that email hasn't been invited. Ask one of the sisters to invite
          you from the <em>People</em> tab.
        </p>
        <button className="btn wide" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </main>
  )
}

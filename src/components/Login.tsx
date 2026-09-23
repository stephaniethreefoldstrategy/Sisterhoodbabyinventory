import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Clover } from './Clover'

const redirectTo = () => window.location.origin + window.location.pathname

type Mode = 'signin' | 'signup' | 'forgot'

export function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) setStatus(error.message)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const addr = email.trim().toLowerCase()
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password })
      if (error) setStatus(error.message === 'Invalid login credentials' ? 'That email and password don\'t match.' : error.message)
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: addr, password, options: { emailRedirectTo: redirectTo() } })
      if (error) setStatus(error.message)
      else if (!data.session) setStatus('Nearly there! Check your inbox and tap the link to confirm your email.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: redirectTo() })
      setStatus(error ? error.message : 'If that email has an account, a reset link is on its way.')
    }
    setBusy(false)
  }

  const switchTo = (m: Mode) => {
    setMode(m)
    setStatus(null)
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

        <button className="btn primary wide" onClick={google}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Continue with Google
        </button>

        <div className="or"><span>or use email</span></div>

        {mode !== 'forgot' && (
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => switchTo('signin')}>
              Sign in
            </button>
            <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => switchTo('signup')}>
              Create account
            </button>
          </div>
        )}

        <form onSubmit={submit} className="stack">
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== 'forgot' && (
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'Choose a password (8+ characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button className="btn wide" disabled={busy}>
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create my account' : 'Send reset link'}
          </button>
        </form>

        {mode === 'signin' && (
          <button className="link-btn" onClick={() => switchTo('forgot')}>
            Forgot password?
          </button>
        )}
        {mode === 'forgot' && (
          <button className="link-btn" onClick={() => switchTo('signin')}>
            Back to sign in
          </button>
        )}
        {mode === 'signup' && (
          <p className="status">Use the email that was added to the sisterhood.</p>
        )}
        {status && <p className="status" role="status">{status}</p>}
      </div>
    </main>
  )
}

// Shown after tapping a password reset link
export function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setStatus(error.message)
    else onDone()
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <Clover fill="#FFA873" size={48} />
        <h1 className="display">New password</h1>
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary wide">Save password</button>
        {status && <p className="status">{status}</p>}
      </form>
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
          You're signed in as <strong>{email}</strong>, but that email hasn't been added. Ask one of the sisters to add
          you under <em>People</em>, then refresh.
        </p>
        <button className="btn wide" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
    </main>
  )
}

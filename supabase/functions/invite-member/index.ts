// Lets a signed-in sister invite someone (or reset their password) without any
// confirmation emails: creates a confirmed login with an easy password to text them.
import { createClient } from 'npm:@supabase/supabase-js@2'

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const COLOURS = ['pink', 'butter', 'matcha', 'latte', 'plum', 'peach']
const WORDS = ['plum', 'clover', 'matcha', 'latte', 'butter', 'peach', 'muslin', 'teddy', 'bunny', 'daisy', 'cloud', 'honey', 'pebble', 'maple', 'willow', 'poppy']
const MAX_MEMBERS = 8

function easyPassword(): string {
  const r = crypto.getRandomValues(new Uint32Array(3))
  return `${WORDS[r[0] % WORDS.length]}-${WORDS[r[1] % WORDS.length]}-${1000 + (r[2] % 9000)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  // Caller must be signed in and on the list
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isMember } = await asUser.rpc('is_member')
  if (!isMember) return json({ error: 'Not allowed' }, 403)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))

  let email: string
  if (body.action === 'invite') {
    email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()
    const colour = COLOURS.includes(body.colour) ? body.colour : 'pink'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) return json({ error: 'Please enter a name and a valid email' }, 400)

    const { data: existing } = await admin.from('members').select('id').eq('email', email).maybeSingle()
    if (!existing) {
      const { count } = await admin.from('members').select('id', { count: 'exact', head: true })
      if ((count ?? 0) >= MAX_MEMBERS) return json({ error: `The sisterhood is full (${MAX_MEMBERS} people)` }, 400)
      const { error } = await admin.from('members').insert({ email, display_name: name, colour })
      if (error) return json({ error: 'Could not add them' }, 500)
    }
  } else if (body.action === 'reset') {
    const { data: m } = await admin.from('members').select('email').eq('id', String(body.member_id ?? '')).maybeSingle()
    if (!m) return json({ error: 'Person not found' }, 404)
    email = m.email
  } else {
    return json({ error: 'Unknown action' }, 400)
  }

  // Create their login, or give an existing one a new password
  const password = easyPassword()
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) return json({ error: 'Could not reach logins' }, 500)
  const user = list.users.find((u) => u.email?.toLowerCase() === email)
  const { error } = user
    ? await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) return json({ error: 'Could not set up their login' }, 500)

  return json({ email, password })
})

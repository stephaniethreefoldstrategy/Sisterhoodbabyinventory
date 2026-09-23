// Given a product page URL, finds the page's main product image (og:image etc.),
// stores it in the item-photos bucket and returns its path. Free: no paid APIs.
import { createClient } from 'npm:@supabase/supabase-js@2'

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MAX_BYTES = 5 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*;q=0.8,*/*;q=0.5',
  'Accept-Language': 'en-AU,en;q=0.9',
}

// Only fetch ordinary public websites
function isPublicUrl(raw: string): URL | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return null // raw IPs
    return u
  } catch {
    return null
  }
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, '/')

function findImage(html: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? []
  const wanted = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']
  for (const key of wanted) {
    for (const tag of metas) {
      const prop = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
      const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]
      if (prop === key && content) return decode(content)
    }
  }
  const imageSrc = html.match(/<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i)?.[0]?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
  if (imageSrc) return decode(imageSrc)
  // Product structured data
  for (const block of html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? []) {
    const m = block.match(/"image"\s*:\s*(?:\[\s*)?(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/)
    if (m) return m[1].replace(/\\\//g, '/')
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isMember } = await supabase.rpc('is_member')
  if (!isMember) return json({ error: 'Not allowed' }, 403)

  const { url } = await req.json().catch(() => ({}))
  const page = typeof url === 'string' ? isPublicUrl(url) : null
  if (!page) return json({ error: 'That link does not look right' }, 400)

  try {
    const res = await fetch(page, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return json({ error: 'Could not open that page' }, 422)

    // Link straight to an image
    let imageUrl: string | null = (res.headers.get('content-type') ?? '').startsWith('image/') ? res.url : null
    if (!imageUrl) {
      const html = (await res.text()).slice(0, 2_000_000)
      const found = findImage(html)
      if (found) imageUrl = new URL(found, res.url).toString()
    }
    const img = imageUrl ? isPublicUrl(imageUrl) : null
    if (!img) return json({ error: 'No product photo on that page' }, 404)

    const imgRes = await fetch(img, { headers: { ...HEADERS, Referer: page.toString() }, signal: AbortSignal.timeout(10_000) })
    const type = (imgRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const ext = TYPES[type]
    if (!imgRes.ok || !ext) return json({ error: 'That photo could not be used' }, 422)
    const bytes = new Uint8Array(await imgRes.arrayBuffer())
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'That photo is too big' }, 422)

    const path = `link-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('item-photos').upload(path, bytes, { contentType: type })
    if (error) return json({ error: 'Could not save the photo' }, 500)
    return json({ photo_path: path })
  } catch {
    return json({ error: 'Could not reach that page' }, 422)
  }
})

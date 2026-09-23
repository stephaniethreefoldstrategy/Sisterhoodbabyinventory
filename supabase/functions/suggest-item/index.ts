// Looks at an item photo and suggests a name, category, description and a real
// product link (found with web search). Called from the Add/Edit item form.
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void }

const CATEGORIES = [
  'Sleep', 'Feeding', 'Out & about', 'Car seats', 'Nursery', 'Bath & changing',
  'Play & toys', 'Clothes', 'Books', 'Safety', 'Other',
]

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SYSTEM = `You help a small group of sisters catalogue shared baby gear.
Given a photo, identify the item as specifically as you can (brand and model if visible or recognisable).
Then use web search to find the product's page, preferring the manufacturer's own site or a major Australian retailer.
Only give a product_link that appeared in your search results; if you cannot find a confident match, set product_link to null.
Finish by calling record_suggestion exactly once. Keep the description to one or two short sentences a parent would find useful (what it is, age/size range if known).`

const suggestTool: Anthropic.Beta.BetaTool = {
  name: 'record_suggestion',
  description: 'Record the identified item. Call once, at the end.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'category', 'description', 'product_link', 'confidence'],
    properties: {
      name: { type: 'string', description: 'Short item name, e.g. "Bugaboo Fox 5 pram"' },
      category: { type: 'string', enum: CATEGORIES },
      description: { type: 'string' },
      product_link: { type: ['string', 'null'], description: 'URL from the search results, or null' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
  },
}

const normalise = (u: string) => {
  try {
    const x = new URL(u)
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}`
  } catch {
    return u
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'Photo suggestions are not switched on yet.' }, 503)

  // Act as the signed-in user so storage and membership rules apply
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: isMember } = await supabase.rpc('is_member')
  if (!isMember) return json({ error: 'Not allowed' }, 403)

  const { photo_path } = await req.json().catch(() => ({}))
  if (typeof photo_path !== 'string' || !photo_path) return json({ error: 'photo_path required' }, 400)

  const { data: file, error: dlError } = await supabase.storage.from('item-photos').download(photo_path)
  if (dlError || !file) return json({ error: 'Could not read that photo' }, 404)
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const media = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

  const client = new Anthropic({ apiKey })
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: media, data: btoa(binary) } },
        { type: 'text', text: 'What is this baby item? Find its product page.' },
      ],
    },
  ]

  try {
    const seenUrls = new Set<string>()
    // Server-side web search can pause long turns; resume up to a few times
    for (let turn = 0; turn < 4; turn++) {
      const response = await client.beta.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SYSTEM,
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3, user_location: { type: 'approximate', country: 'AU' } }, suggestTool],
        tool_choice: { type: 'auto' },
        messages,
      })

      for (const block of response.content) {
        if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          for (const r of block.content) seenUrls.add(normalise(r.url))
        }
      }

      if (response.stop_reason === 'refusal') return json({ error: 'Could not identify this one.' }, 422)

      const call = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'record_suggestion',
      )
      if (call) {
        const s = call.input as { name: string; category: string; description: string; product_link: string | null; confidence: string }
        // Never pass on a link the search didn't actually return
        const link = s.product_link && seenUrls.has(normalise(s.product_link)) ? s.product_link : null
        return json({ ...s, product_link: link })
      }

      if (response.stop_reason !== 'pause_turn') break
      messages.push({ role: 'assistant', content: response.content })
    }
    return json({ error: 'Could not identify this one.' }, 422)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Busy right now, try again in a minute.' }, 429)
    if (e instanceof Anthropic.APIError) return json({ error: `Suggestion service error (${e.status})` }, 502)
    return json({ error: 'Something went wrong' }, 500)
  }
})

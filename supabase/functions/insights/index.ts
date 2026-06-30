// LLM coaching endpoint. Receives a metrics summary and returns free-form guidance.
// Provider is swappable via the LLM_PROVIDER secret ('anthropic' | 'openai').
// Set ANTHROPIC_API_KEY or OPENAI_API_KEY accordingly.
import { cors, json } from '../_shared/cors.ts'
import { userFromRequest } from '../_shared/supa.ts'

const SYSTEM =
  'You are an evidence-based strength & conditioning assistant. Given an athlete load/readiness summary, ' +
  'give 3-5 concise, actionable coaching recommendations as a short markdown bullet list. ' +
  'Reference ACWR sweet spot 0.8-1.3, monotony, HRV deviation and wellness where relevant. Be specific and brief.'

async function anthropic(summary: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6', max_tokens: 500, system: SYSTEM, messages: [{ role: 'user', content: summary }] }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(JSON.stringify(d))
  return d.content?.[0]?.text ?? ''
}

async function openai(summary: string) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: summary }] }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(JSON.stringify(d))
  return d.choices?.[0]?.message?.content ?? ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { summary } = await req.json()
    if (!summary) return json({ error: 'missing summary' }, 400)
    const provider = (Deno.env.get('LLM_PROVIDER') ?? 'anthropic').toLowerCase()
    const text = provider === 'openai' ? await openai(summary) : await anthropic(summary)
    return json({ text })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

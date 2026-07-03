// LLM voice-to-workout parsing endpoint (spec 5.1). Receives a dictated
// transcript and returns structured blocks JSON matching the master schema.
// Provider is swappable via the LLM_PROVIDER secret ('anthropic' | 'openai'),
// same as the insights function.
import { cors, json } from '../_shared/cors.ts'
import { userFromRequest } from '../_shared/supa.ts'

const SYSTEM =
  'You are an expert sports science data parser. Your task is to process a transcript dictated ' +
  'by a strength coach into a structured, validated JSON format matching the master schema.\n\n' +
  'CRITICAL INSTRUCTION FOR VOICE CORRECTIONS:\n' +
  'Coaches frequently misspeak and correct themselves mid-sentence. You must process intent, not ' +
  'literal historical dictates. If a coach changes a parameter value, immediately discard the ' +
  'previous value and capture the final state.\n\n' +
  'Return ONLY a JSON object (no markdown fences, no commentary) of the shape:\n' +
  '{"blocks":[{"blockType":"Warm-up"|"Main Lifts"|"Assisted"|"Core/Others"|"Cool-down",' +
  '"autoCalculate1RM":boolean,"exercises":[{"exerciseName":string,"intensityType":"%1RM"|"RPE"|"Load"|"Target HR",' +
  '"supersetLinkId":string|null,"setCount":number,"prescribedReps":number,' +
  '"prescribedIntensityValue":number|null,"prescribedLoadKg":number|null}]}]}\n' +
  'Defaults when unstated: blockType "Main Lifts", intensityType "Load", setCount 3, prescribedReps 10. ' +
  'Weights are kilograms. RPE is 1–10. %1RM values are percentages (e.g. 80).'

async function anthropic(transcript: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6', max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: transcript }] }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(JSON.stringify(d))
  return d.content?.[0]?.text ?? ''
}

async function openai(transcript: string) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: transcript }],
    }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(JSON.stringify(d))
  return d.choices?.[0]?.message?.content ?? ''
}

// Strip accidental markdown fences and parse.
function toJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  return JSON.parse(cleaned)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const user = await userFromRequest(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const { transcript } = await req.json()
    if (!transcript) return json({ error: 'missing transcript' }, 400)
    const provider = (Deno.env.get('LLM_PROVIDER') ?? 'anthropic').toLowerCase()
    const text = provider === 'openai' ? await openai(transcript) : await anthropic(transcript)
    return json(toJson(text))
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

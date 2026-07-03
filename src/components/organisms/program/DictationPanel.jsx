// AI voice-to-workout pipeline (spec 5): Web Speech transcription → parse
// (LLM edge function in backend mode, heuristic parser locally) → preview →
// inject into the builder. Synonym mapping runs before injection; unmapped
// names arrive flagged for manual validation.
import { useState, useRef, useEffect } from 'react'
import Button from '../../atoms/Button'
import { callFunction, hasBackend } from '../../../api/functions'
import { parseTranscript, normalizeParsed, applySynonyms } from '../../../lib/voiceParse'

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

export default function DictationPanel({ synonyms, exercises, onInsert, onBack }) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const recRef = useRef(null)

  useEffect(() => () => recRef.current?.stop?.(), [])

  const start = () => {
    if (!SR) { setErr('Speech recognition is not supported in this browser — type or paste the dictation below instead.'); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const chunk = [...e.results].slice(e.resultIndex).map((r) => r[0].transcript).join(' ')
      setTranscript((t) => (t + ' ' + chunk).trim())
    }
    rec.onerror = (e) => { setErr('Mic error: ' + e.error); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setErr('')
    rec.start()
    setListening(true)
  }
  const stop = () => { recRef.current?.stop(); setListening(false) }

  const parse = async () => {
    if (!transcript.trim()) return
    setBusy(true)
    setErr('')
    let blocks = []
    if (hasBackend) {
      try {
        const res = await callFunction('parse-workout', { transcript })
        blocks = normalizeParsed(res)
      } catch (e) {
        console.warn('LLM parse failed, using local parser', e)
        blocks = parseTranscript(transcript)
      }
    } else {
      blocks = parseTranscript(transcript)
    }
    blocks = applySynonyms(blocks, synonyms, exercises)
    setParsed(blocks)
    if (!blocks.length) setErr('Nothing parseable found — try “Main lift block: back squat, 5 sets of 5 at 80 percent”.')
    setBusy(false)
  }

  return (
    <div className="dictate">
      <div className="section-title" style={{ marginTop: 0 }}>🎙️ Dictate workout</div>
      <div className="flex gap" style={{ marginBottom: 8 }}>
        {listening
          ? <Button variant="danger" size="sm" onClick={stop}><span className="rec-dot" /> Stop listening</Button>
          : <Button size="sm" onClick={start}>Start listening</Button>}
        <Button variant="ghost" size="sm" onClick={parse} disabled={busy || !transcript.trim()}>
          {busy ? 'Parsing…' : `Parse transcript${hasBackend ? ' (AI)' : ''}`}
        </Button>
      </div>
      <textarea
        rows={4}
        value={transcript}
        placeholder='e.g. "Main lift block. Bench press, three sets of ten… no wait, scratch that — four sets of eight at RPE 8. Then assisted block: RDL, 3 sets of 12 at 60 kilos."'
        aria-label="Dictation transcript"
        onChange={(e) => { setTranscript(e.target.value); setParsed(null) }}
      />
      {err && <div className="muted" style={{ color: 'var(--accent2)', fontSize: 12, margin: '6px 0' }}>{err}</div>}

      {parsed?.length > 0 && (
        <div className="dictate-preview">
          {parsed.map((b) => (
            <div key={b.blockId} style={{ marginBottom: 6 }}>
              <strong>{b.blockType}</strong>
              {b.exercises.map((e) => (
                <div key={e.exerciseId} className={e.unmapped ? 'dp-unmapped' : ''} style={{ fontSize: 12, paddingLeft: 10 }}>
                  {e.unmapped ? '⚠ ' : '✓ '}{e.exerciseName} — {e.sets.length}×{e.sets[0]?.prescribedReps}
                  {e.sets[0]?.prescribedIntensityValue != null ? ` @ ${e.sets[0].prescribedIntensityValue}${e.intensityType === '%1RM' ? '%' : e.intensityType === 'RPE' ? ' RPE' : ''}` : ''}
                  {e.sets[0]?.prescribedLoadKg != null ? ` · ${e.sets[0].prescribedLoadKg}kg` : ''}
                  {e.unmapped ? ' (needs validation)' : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onBack}>Cancel</Button>
        <Button disabled={!parsed?.length} onClick={() => onInsert(parsed)}>Insert into workout</Button>
      </div>
    </div>
  )
}

import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'

function toCSV(rows) {
  return rows
    .map((r) => r.map((v) => {
      v = v == null ? '' : '' + v
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    }).join(','))
    .join('\n')
}

function downloadFile(name, content) {
  try {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 100)
  } catch {
    alert('Export not supported here.')
  }
}

export default function ExportMenu({ clientId }) {
  const { db } = useData()
  const { closeModal } = useModal()
  const who = clientId ? db.clients.find((c) => c.id === clientId)?.name : 'all athletes'
  const cname = (id) => db.clients.find((c) => c.id === id)?.name || id
  const filt = (arr) => (clientId ? arr.filter((x) => x.clientId === clientId) : arr)

  const specs = {
    wellness: ['Wellness', ['Athlete', 'Date', 'Sleep', 'Stress', 'Fatigue', 'Soreness', 'Score'], (w) => [cname(w.clientId), w.date, w.sleep, w.stress, w.fatigue, w.soreness, w.score]],
    srpe: ['SessionRPE', ['Athlete', 'Date', 'sRPE', 'Duration(min)', 'sRPE-TL(AU)'], (s) => [cname(s.clientId), s.date, s.rpe, s.duration, s.tl]],
    resistance: ['Resistance', ['Athlete', 'Date', 'Exercise', 'Pattern', 'Sets', 'Reps', 'Weight(kg)', 'VolumeLoad(kg)'], (r) => [cname(r.clientId), r.date, r.exercise, r.pattern, r.sets, r.reps, r.weight, r.volumeLoad]],
    cardio: ['Conditioning', ['Athlete', 'Date', 'Modality', 'TRIMP', 'TiZ(min)', 'TSS', 'HSD(km)'], (x) => [cname(x.clientId), x.date, x.modality, x.trimp, x.tiz, x.tss, x.hsd]],
    wearable: ['Wearable', ['Athlete', 'Date', 'HRV(ms)', 'RHR(bpm)', 'Sleep(h)', 'Source'], (x) => [cname(x.clientId), x.date, x.hrv, x.rhr, x.sleepHrs, x.source]],
  }
  const tag = clientId ? '_' + cname(clientId).replace(/\s+/g, '-') : ''

  const run = (type) => {
    if (type === 'all') {
      let out = ''
      for (const k in specs) {
        const [title, head, row] = specs[k]
        out += '# ' + title + '\n' + toCSV([head, ...filt(db[k]).map(row)]) + '\n\n'
      }
      downloadFile('fitscribe' + tag + '_all.csv', out)
    } else {
      const [, head, row] = specs[type]
      downloadFile('fitscribe' + tag + '_' + type + '.csv', toCSV([head, ...filt(db[type]).map(row)]))
    }
  }

  const buttons = [
    ['wellness', 'Wellness (Hooper)'], ['srpe', 'Session RPE'], ['resistance', 'Resistance'],
    ['cardio', 'Conditioning'], ['wearable', 'Wearable'], ['all', 'Everything (combined)'],
  ]
  return (
    <ModalShell title={'Export — ' + who} onClose={closeModal}
      footer={<Button variant="ghost" onClick={closeModal}>Close</Button>}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Download CSV files for backup or to share with athletes / medical staff.
      </p>
      <div className="grid cards-2" style={{ gap: 10 }}>
        {buttons.map(([k, label]) => <Button key={k} variant="ghost" onClick={() => run(k)}>{label}</Button>)}
      </div>
    </ModalShell>
  )
}

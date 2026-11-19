import { useState } from 'react'
import LiveSessionDialog from '../../../molecules/LiveSessionDialog'

export default function LivePlateCalculator({ units, onClose, onUse }) {
  const [bar, setBar] = useState(units === 'lb' ? 45 : 20)
  const [plates, setPlates] = useState([])
  const palette = units === 'lb' ? [45, 35, 25, 10, 5, 2.5, 1.25] : [25, 20, 15, 10, 5, 2.5, 1.25]
  const total = Math.round((Number(bar) + plates.reduce((sum, plate) => sum + plate * 2, 0)) * 100) / 100
  return <LiveSessionDialog title="Plate calculator" onClose={onClose} onSubmit={() => { onUse(total); onClose() }} confirm="Use total">
    <label>Bar weight ({units})<input type="number" min="0" max={units === 'lb' ? 4000 : 2000} step="0.01" required value={bar} onChange={(event) => setBar(event.target.value)} /></label>
    <p className="ls-plate-total">{total} {units}</p><p className="ls-hint">Add one plate to each side. Select a plate below to remove the pair.</p>
    <div className="ls-tools ls-plate-stack">{plates.map((plate, index) => <button type="button" className="ls-button" key={index} aria-label={`Remove ${plate} ${units} from each side`}
      onClick={() => setPlates(plates.filter((_, i) => i !== index))}>{plate} × 2</button>)}</div>
    <div className="ls-tools ls-plate-stack">{palette.map((plate) => <button type="button" className="ls-button" key={plate} disabled={total + plate * 2 > (units === 'lb' ? 4400 : 2000)} onClick={() => setPlates([...plates, plate])}>+{plate}</button>)}</div>
  </LiveSessionDialog>
}

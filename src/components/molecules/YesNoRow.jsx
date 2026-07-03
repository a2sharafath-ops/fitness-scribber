import SegToggle from './SegToggle'

// One YES/NO instrument question. Presentational: value is true | false | undefined.
// `note` renders instrument-mandated clarification text; children render an
// optional follow-on input (e.g. a "please list" field) when answered YES.
export default function YesNoRow({ text, note, value, onChange, children }) {
  return (
    <div className="yn-row">
      <div className="yn-q">
        <div>{text}</div>
        {note && <div className="yn-note">{note}</div>}
      </div>
      <SegToggle options={[[true, 'Yes'], [false, 'No']]} value={value} onChange={onChange} ariaLabel={text} />
      {children}
    </div>
  )
}

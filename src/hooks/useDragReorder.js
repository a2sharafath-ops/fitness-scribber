import { useState } from 'react'

/**
 * Drag-to-reorder for a list, driven by an explicit grip handle.
 *
 * A row only becomes draggable while its handle is held. That matters here
 * because the rows are full of text inputs and selects — marking them
 * permanently `draggable` would break selecting text inside them, and on some
 * browsers stop the inputs receiving focus at all.
 *
 * Each call creates its own state, so nesting is safe: a block list and the
 * exercise list inside each block use separate instances, and dragging an
 * exercise never registers as a block drag (the outer instance has no source,
 * so it ignores the drag entirely).
 *
 * @param {(from:number, to:number) => void} onMove committed on drop
 */
export default function useDragReorder(onMove) {
  const [armed, setArmed] = useState(null)  // index whose handle is held
  const [src, setSrc] = useState(null)      // index being dragged
  const [over, setOver] = useState(null)    // index currently hovered

  const reset = () => { setArmed(null); setSrc(null); setOver(null) }

  return {
    src,
    over,
    /** Props for the grip. Arming on press is what makes the row draggable. */
    handleProps: (i) => ({
      onMouseDown: () => setArmed(i),
      onTouchStart: () => setArmed(i),
      // If the press ends without a drag starting, disarm so the row goes back
      // to behaving like ordinary content.
      onMouseUp: () => setArmed((a) => (src == null ? null : a)),
    }),
    /** Props for the row itself. */
    itemProps: (i) => ({
      draggable: armed === i,
      onDragStart: (e) => {
        setSrc(i)
        e.dataTransfer.effectAllowed = 'move'
        // Required for Firefox to start a drag at all.
        e.dataTransfer.setData('text/plain', String(i))
        e.stopPropagation()
      },
      onDragEnd: reset,
      onDragOver: (e) => {
        if (src == null) return          // not our drag (e.g. a nested list's)
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        e.stopPropagation()
        if (over !== i) setOver(i)
      },
      onDragLeave: () => setOver((o) => (o === i ? null : o)),
      onDrop: (e) => {
        if (src == null) return
        e.preventDefault()
        e.stopPropagation()
        const from = src
        reset()
        if (from !== i) onMove(from, i)
      },
    }),
  }
}

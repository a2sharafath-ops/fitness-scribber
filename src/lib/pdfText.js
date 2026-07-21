// PDF reading in the browser — text layer first, page images for OCR fallback.
//
// Isolated here so the parsing logic (bodyCompPdf.js) stays pure and testable:
// this file owns the PDF I/O and the pdf.js dependency.
//
// Dependency note: pdfjs-dist is the one thing neither the browser nor Bun
// provides — there is no native API for reading a PDF's text layer, and device
// reports use embedded/CID fonts that a hand-rolled stream reader would mangle.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Reports are 1–2 pages; cap so a mistakenly-picked 200-page file can't hang the tab.
const MAX_PAGES = 10
// Pages carrying this little text are treated as having no text layer (a scan).
const TEXT_LAYER_MIN_CHARS = 20
// Scanned reports are usually 150 DPI; rendering at ~2.5× the 72 DPI default
// puts us near 180–220 DPI, which is where Tesseract's accuracy plateaus.
// Higher costs render time and memory for no real gain.
const OCR_SCALE = 2.5

const openDoc = async (file) => {
  try {
    const buf = await file.arrayBuffer()
    return await getDocument({ data: buf, isEvalSupported: false }).promise
  } catch {
    throw new Error("That file couldn't be opened as a PDF. It may be corrupted or password-protected.")
  }
}

/**
 * Extract the text layer from a PDF.
 *
 * Returns '' for scanned/image PDFs that carry no text layer — the caller is
 * expected to fall back to OCR rather than treat that as an error.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  const doc = await openDoc(file)
  try {
    const pages = Math.min(doc.numPages, MAX_PAGES)
    const out = []
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      out.push(content.items.map((it) => it.str).join(' '))
    }
    const text = out.join('\n')
    return text.replace(/\s/g, '').length < TEXT_LAYER_MIN_CHARS ? '' : text
  } finally {
    doc.destroy?.()
  }
}

/**
 * Rasterise a PDF's pages so they can be fed to OCR.
 *
 * @param {File|Blob} file
 * @param {(done:number,total:number)=>void} [onPage] progress callback
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function renderPdfPages(file, onPage) {
  const doc = await openDoc(file)
  try {
    const pages = Math.min(doc.numPages, MAX_PAGES)
    const canvases = []
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: OCR_SCALE })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const canvasContext = canvas.getContext('2d', { willReadFrequently: true })
      // White backdrop: scans often have transparent regions that would
      // otherwise rasterise to black and destroy OCR contrast.
      canvasContext.fillStyle = '#fff'
      canvasContext.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext, viewport }).promise
      canvases.push(canvas)
      onPage?.(i, pages)
    }
    return canvases
  } finally {
    doc.destroy?.()
  }
}

// PDF → text, in the browser. Thin wrapper over pdf.js.
//
// Isolated here so the parsing logic (bodyCompPdf.js) stays pure and testable:
// this file owns the only I/O and the only dependency.
//
// Dependency note: pdfjs-dist is the one thing neither the browser nor Bun
// provides — there is no native API for reading a PDF's text layer, and device
// reports use embedded/CID fonts that a hand-rolled stream reader would mangle.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Reports are 1–2 pages; cap so a mistakenly-picked 200-page file can't hang the tab.
const MAX_PAGES = 10

/**
 * Extract the text layer from a PDF file.
 *
 * Text runs are joined with spaces and pages with newlines, which keeps
 * label/value pairs adjacent even when the PDF splits them across runs.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>}
 * @throws {Error} with a coach-readable message when the file isn't usable.
 */
export async function extractPdfText(file) {
  let doc
  try {
    const buf = await file.arrayBuffer()
    doc = await getDocument({ data: buf, isEvalSupported: false }).promise
  } catch {
    throw new Error("That file couldn't be opened as a PDF. It may be corrupted or password-protected.")
  }

  try {
    const pages = Math.min(doc.numPages, MAX_PAGES)
    const out = []
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      out.push(content.items.map((it) => it.str).join(' '))
    }
    const text = out.join('\n')
    // A PDF that is a photo/scan of a printout has no text layer. Say so plainly
    // rather than reporting "no values found", which sounds like a parser bug.
    if (text.replace(/\s/g, '').length < 20) {
      throw new Error('This PDF has no readable text — it looks like a scan or image. Enter the values manually, or export a text PDF from the device.')
    }
    return text
  } finally {
    doc.destroy?.()
  }
}

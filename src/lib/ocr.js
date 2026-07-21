// OCR for scanned body-composition reports.
//
// Used only as a fallback: if a PDF has a text layer we read that (fast, exact).
// Scans and phone photos have no text layer, so we rasterise and recognise.
//
// Dependency note: tesseract.js is a WASM build of Tesseract. OCR cannot be done
// with platform APIs, and sending client health data to a third-party OCR
// service would be a privacy regression — this runs entirely in the browser.
//
// The engine and its language data (~4 MB) are fetched on first use and then
// cached by the browser, which is why everything here is lazily loaded.

let workerPromise = null

// One shared worker across uploads — spinning one up costs seconds.
async function getWorker(onStatus) {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      return createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') onStatus?.('reading', m.progress)
          else if (String(m.status).includes('loading') || String(m.status).includes('initial')) onStatus?.('loading', m.progress)
        },
      })
    })().catch((e) => { workerPromise = null; throw e })
  }
  return workerPromise
}

/**
 * Run OCR over one or more images.
 *
 * @param {Array<HTMLCanvasElement|Blob|File|string>} images
 * @param {(phase:'loading'|'reading'|'page', progress:number, page?:number, total?:number)=>void} [onStatus]
 * @returns {Promise<string>} recognised text, pages joined by newlines
 */
export async function imagesToText(images, onStatus) {
  let worker
  try {
    worker = await getWorker(onStatus)
  } catch {
    throw new Error('The text-recognition engine could not be loaded. Check your connection and try again.')
  }

  const out = []
  for (let i = 0; i < images.length; i++) {
    onStatus?.('page', 0, i + 1, images.length)
    const { data } = await worker.recognize(images[i])
    out.push(data?.text || '')
  }
  return out.join('\n')
}

/** Frees the shared worker. Safe to call when the import UI closes. */
export async function releaseOcr() {
  if (!workerPromise) return
  const p = workerPromise
  workerPromise = null
  try { (await p).terminate() } catch { /* already gone */ }
}

/** True for the image types a coach might photograph or scan a report into. */
export const isImageFile = (file) => /^image\//.test(file?.type || '') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file?.name || '')

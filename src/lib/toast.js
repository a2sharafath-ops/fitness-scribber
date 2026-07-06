// Tiny imperative toast + dialog store (framework-agnostic pub/sub).
// UI is rendered once by <Toaster /> near the app root. Import the helpers
// anywhere — no hook/context threading required:
//   toast('Saved')                      -> success toast
//   toast('Sync failed', 'error')       -> error toast
//   await confirmDialog('Delete this?') -> Promise<boolean>
//   await promptDialog('Note:')         -> Promise<string|null>
import { uid } from './format'

let state = { toasts: [], dialog: null }
const listeners = new Set()

const emit = () => { for (const l of listeners) l(state) }

export function subscribe(fn) {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

export function dismissToast(id) {
  state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) }
  emit()
}

// type: 'success' | 'error' | 'info'
export function toast(message, type = 'success', ttl = 3400) {
  const id = uid()
  state = { ...state, toasts: [...state.toasts, { id, message, type }] }
  emit()
  if (ttl) setTimeout(() => dismissToast(id), ttl)
  return id
}

// opts: string | { message, title, confirmLabel, cancelLabel, danger }
export function confirmDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts
  return new Promise((resolve) => {
    state = { ...state, dialog: { kind: 'confirm', ...o, resolve } }
    emit()
  })
}

// opts: string | { message, title, defaultValue, placeholder, multiline, confirmLabel }
export function promptDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts
  return new Promise((resolve) => {
    state = { ...state, dialog: { kind: 'prompt', ...o, resolve } }
    emit()
  })
}

// value: boolean (confirm) or string|null (prompt)
export function resolveDialog(value) {
  const d = state.dialog
  state = { ...state, dialog: null }
  emit()
  if (d) d.resolve(value)
}

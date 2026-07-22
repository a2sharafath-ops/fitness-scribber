// Reordering helpers. Pure, React-free.

/**
 * Move the item at `from` to index `to`, returning a new array.
 *
 * Out-of-range or no-op moves return the original array untouched, so callers
 * can pass raw drag indices without guarding first.
 *
 * @template T
 * @param {T[]} list
 * @param {number} from
 * @param {number} to
 * @returns {T[]}
 */
export function moveItem(list, from, to) {
  if (!Array.isArray(list)) return list
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Move an item and rewrite its 1-based `order` field to match the new
 * positions. Blocks, exercises and sets all persist an explicit order, which
 * has to stay in step with array position or a reload would undo the drag.
 *
 * @template {{order?: number}} T
 * @param {T[]} list
 * @param {number} from
 * @param {number} to
 * @param {string} [key]
 * @returns {T[]}
 */
export function moveOrdered(list, from, to, key = 'order') {
  const moved = moveItem(list, from, to)
  if (moved === list) return list
  return moved.map((item, i) => ({ ...item, [key]: i + 1 }))
}

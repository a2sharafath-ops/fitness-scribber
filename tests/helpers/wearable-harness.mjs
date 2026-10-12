import fs from 'node:fs'
import vm from 'node:vm'
import { stripTypeScriptTypes } from 'node:module'

export function createHandler(name, dependencies = {}, env = {}) {
  let serve
  const context = vm.createContext({
    Request, Response, URL, URLSearchParams, crypto, TextEncoder, btoa, atob,
    fetch: async () => { throw new Error('Network forbidden in tests') },
    cors: {}, json: (body, status = 200) => Response.json(body, { status }),
    Deno: { serve: fn => { serve = fn }, env: { get: key => env[key] } },
    ...dependencies,
  })
  function source(file) {
    return stripTypeScriptTypes(fs.readFileSync(`supabase/functions/${file}`, 'utf8').replace(/^import .*\r?\n/gm, '')).replace(/^export /gm, '')
  }
  for (const [file, names] of [['_shared/wearable-auth.ts', 'validProof,randomProof,digest,ownedClient,callbackUri,appRedirect'], ['_shared/wearable-token.ts', 'exchangeToken']]) {
    Object.assign(context, vm.runInContext(`(()=>{${source(file)};return {${names}}})()`, context))
  }
  // Allow narrowly scoped doubles (e.g. external token exchange), retaining real
  // authorization, proof and state logic by default.
  Object.assign(context, dependencies)
  vm.runInContext(source(`${name}/index.ts`), context)
  return serve
}

// In-memory query double models conditional UPDATE and DELETE RETURNING so
// request expiry, provider binding, user/proof filters and replay are exercised.
export function memoryDb(initial = {}, fail = () => false) {
  const tables = structuredClone(initial), calls = []
  return { tables, calls, from(table) {
    const call = { table, op: 'select', filters: [] }; calls.push(call)
    let values, columns = '*'
    const matches = row => call.filters.every(([op,k,v]) => op === 'eq' ? row[k] === v : op === 'gt' ? row[k] > v : op === 'is' ? (row[k] ?? null) === v : row[k] != null)
    const project = row => columns === '*' ? { ...row } : Object.fromEntries(columns.split(',').map(k => [k, row[k]]))
    function run(single = false) {
      if (fail(call)) return { data: null, error: { message: 'private database failure' } }
      const rows = tables[table] ||= []
      let result = rows.filter(matches)
      if (call.op === 'insert') { result = [{ code: null, ...values }]; rows.push(...result) }
      if (call.op === 'update') result.forEach(row => Object.assign(row, values))
      if (call.op === 'delete') tables[table] = rows.filter(row => !matches(row))
      if (call.op === 'upsert') { result = [{ ...values }]; rows.push(...result) }
      return { data: single ? result.length ? project(result[0]) : null : result.map(project), error: null }
    }
    const query = {
      select(value) { columns = value; call.columns = value; return this },
      insert(value) { call.op = 'insert'; call.values = values = value; return this },
      update(value) { call.op = 'update'; call.values = values = value; return this },
      upsert(value) { call.op = 'upsert'; call.values = values = value; return this },
      delete() { call.op = 'delete'; return this },
      eq(k,v) { call.filters.push(['eq',k,v]); return this },
      gt(k,v) { call.filters.push(['gt',k,v]); return this },
      is(k,v) { call.filters.push(['is',k,v]); return this },
      not(k,op,v) { if (op !== 'is' || v !== null) throw new Error('unsupported filter'); call.filters.push(['notNull',k,v]); return this },
      maybeSingle: async () => run(true),
      then(resolve,reject) { return Promise.resolve(run()).then(resolve,reject) },
    }
    return query
  } }
}

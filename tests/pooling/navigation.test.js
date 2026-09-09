import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {poolingNavigation, poolingSectionId} from '../../src/lib/pooling/navigation.js'

const all = options => Object.values(poolingNavigation(options)).flat()
const active = {clientId:'fictional-navigation', r1:true, r2:true, r3:true}

test('navigation without a workspace never guesses a client or links to client actions', () => {
  const items = all()
  assert.deepEqual(items.filter(item => item.to).map(item => item.key), ['setup', 'walkthrough'])
  assert(items.filter(item => !item.to).every(item => item.reason))
})
test('active workspace provides exact, client-scoped workflow and review destinations', () => {
  const items = all(active)
  assert.equal(items.length, 14)
  assert.equal(new Set(items.map(item => item.to)).size, items.length)
  assert(items.every(item => item.to && poolingSectionId(item.to.slice(item.to.indexOf('#')))))
  assert.equal(items.find(item => item.key === 'sessions').to, '/clients/fictional-navigation#governed-workouts')
  assert.equal(items.find(item => item.key === 'approve').to, '/clients/fictional-navigation/pool#pool-exact-title')
})
test('routes encode the exact client ID and never reuse a previous client', () => {
  assert(all({...active,clientId:'client/with?#symbols'}).find(row => row.key === 'sessions').to.startsWith('/clients/client%2Fwith%3F%23symbols#'))
  assert(all({...active,clientId:'next-client'}).filter(row => row.to.startsWith('/clients/')).every(row => row.to.startsWith('/clients/next-client')))
})
test('disabled R2/R3 capabilities cannot be exposed by navigation', () => {
  const keys = all({clientId:active.clientId,r1:true}).map(row => row.key)
  for (const key of ['daily', 'progression', 'weekly', 'reassessment']) assert(!keys.includes(key))
})
test('inactive workspace retains setup, guide and preserved sessions but disables pooling actions', () => {
  const items = all({...active,r1:false,r2:false,r3:false})
  assert.deepEqual(items.filter(row => row.to).map(row => row.key), ['setup','prepare','sessions','walkthrough'])
  assert(items.filter(row => !row.to).every(row => row.reason.includes('inactive')))
})
test('loading or failed review data cannot link to an unmounted approval or extension section', () => {
  const loading = all({...active,reviewReady:false})
  assert(!loading.find(row => row.key === 'approve').to)
  assert(loading.find(row => row.key === 'sessions').to)
  const missingPolicies = all({...active,extensionsReady:false})
  for (const key of ['daily','progression']) assert(!missingPolicies.find(row => row.key === key).to)
  assert(missingPolicies.find(row => row.key === 'weekly').to)
})
test('ordinary pooling client navigation does not imply fictional test authority', () => {
  const items = all({...active,testOnly:false})
  assert(items.every(row => row.to.startsWith('/clients/fictional-navigation')))
  assert(!items.some(row => ['setup','prepare','walkthrough'].includes(row.key)))
})
test('fragment focus accepts only known section IDs, not selectors or arbitrary elements', () => {
  for (const value of ['',null,'#password','#%zz','#pool-exact-title input','pool-exact-title']) assert.equal(poolingSectionId(value),null)
  assert.equal(poolingSectionId('#pool-exact-title'),'pool-exact-title')
})
test('all navigation destinations have matching focusable headings in their actual page components', () => {
  const files = {
    'test-setup':'src/pages/PoolingTestPage.jsx', 'test-prepare':'src/pages/PoolingTestPage.jsx', 'test-walkthrough':'src/pages/PoolingTestPage.jsx',
    'pool-source-title':'src/components/organisms/program/PoolingSourceReview.jsx',
    'pool-suggestions-title':'src/components/organisms/program/PoolingSuggestions.jsx',
    'pool-exact-title':'src/components/organisms/program/PoolingApprovalReview.jsx',
    'daily-review-title':'src/components/organisms/program/PoolingExtensionReview.jsx',
    'progression-review-title':'src/components/organisms/program/PoolingExtensionReview.jsx',
    'governed-workouts':'src/components/organisms/workout/GovernedWorkoutPanel.jsx',
    'weekly-review-title':'src/components/organisms/program/PoolingWeeklyReview.jsx',
    'review-drafts':'src/pages/ExercisePoolPage.jsx', 'health-review':'src/pages/ExercisePoolPage.jsx',
    'pool-reassessment-title':'src/components/organisms/program/PoolingReassessment.jsx', 'candidate-review':'src/pages/ExercisePoolPage.jsx',
  }
  for (const row of all(active)) {
    const id = poolingSectionId(row.to.slice(row.to.indexOf('#')))
    const source = readFileSync(files[id], 'utf8')
    const needle = ['daily-review-title','progression-review-title'].includes(id) ? 'id={`${kind}-review-title`} tabIndex={-1}' : `id="${id}" tabIndex={-1}`
    assert(source.includes(needle), `Missing focus target: ${id}`)
  }
})

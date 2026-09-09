import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('ordinary coach routes use the guided experience and keep advanced recovery separate', () => {
  const app = source('src/App.jsx')
  assert.match(app, /path="\/" element={<DashboardPage/)
  assert.match(app, /path="\/clients\/:id" element={<ClientDetailPage/)
  assert.match(app, /path="\/clients\/:id\/pool"[^\n]+<CoachWorkoutPage/)
  assert.match(app, /path="\/clients\/:id\/pool\/advanced"[^\n]+<ExercisePoolPage/)
  assert.match(app, /path="\/pooling-test" element={<Navigate to="\/clients" replace/)
})

test('coach workout flow retains an explicit review and approval boundary', () => {
  const page = source('src/pages/CoachWorkoutPage.jsx')
  const setup = source('src/components/organisms/program/CoachWorkoutSetup.jsx')
  assert.match(page, /Details','Review workout','Approve','Assigned/)
  assert.match(page, /I reviewed the exercises, targets and client information/)
  assert.match(page, /Approve and assign to/)
  assert.match(page, /Help and recovery/)
  assert.match(setup, /Nothing will be assigned yet/)
  assert.match(setup, /I reviewed the client information above and confirmed the equipment/)
})

test('primary coach navigation uses task language rather than engine language', () => {
  const sidebar = source('src/components/organisms/Sidebar.jsx')
  const subnav = source('src/components/templates/ClientSubnav.jsx')
  for (const label of ['Today', 'Clients', 'Calendar', 'Workouts', 'Messages']) assert.match(sidebar, new RegExp(`'${label}'`))
  for (const label of ['Summary', 'Details', 'Assessments', 'Workouts', 'Progress']) assert.match(subnav, new RegExp(`'${label}'`))
  assert.doesNotMatch(sidebar, /Exercise Pool|Context Preparation|Validate & Approve/)
  assert.doesNotMatch(subnav, /Exercise Pool|Load & Strength|Monitoring/)
})

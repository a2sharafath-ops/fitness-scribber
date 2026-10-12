import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
after(() => vite.close())
const load = path => vite.ssrLoadModule(`/src/${path}`)
const lib = await load('lib/programLibrary.js')
const { programStarters } = await load('lib/programStarters.js')
const { seedBuilderQA } = await load('lib/builderQA.js')
const { persistDiff } = await load('api/sync.js')
const { validatePrescription, editPrescribedSet } = await load('lib/prescription.js')
const { buildFromPrescription, targetLoadKg } = await load('lib/workout.js')
const { prescriptionVolume } = await load('lib/prescriptionMetrics.js')
const { resolveTrainingMax } = await load('lib/program.js')
const today = '2026-10-11'
const fixture = () => lib.ensureLibrary(seedBuilderQA(today))
const options = (db, clientIndex = 0) => ({ clientId: db.clients[clientIndex].id, start: '2026-11-02', from: 1, through: 2 })

test('six starter templates are valid multi-week programs with unique fresh session/set IDs', () => {
  const programs = programStarters()
  assert.equal(programs.length, 6)
  for (const p of programs) {
    lib.validateProgram(p)
    const ids = p.data.weeks.flatMap(w => w.flatMap(s => [s.id, ...s.blocks.flatMap(b => b.exercises.flatMap(e => [e.exerciseId, ...e.sets.map(s => s.setId)]))]))
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(p.data.weeks[0][0].blocks[0].exercises[0].sets[0].prescribedRir, 3)
    assert.equal(p.data.weeks[2][0].blocks[0].exercises[0].sets[0].prescribedRir, 2)
  }
})
test('selected template weeks map onto chosen weekdays without filling rest days', () => {
  const p = programStarters()[3]
  const targets = lib.assignmentTargets(p, { start: '2026-11-02', from: 3, through: 4, mapping: [1,2,3,5,6] })
  assert.deepEqual(targets.slice(0,5).map(t => t.date), ['2026-11-03','2026-11-04','2026-11-05','2026-11-07','2026-11-08'])
  assert.equal(targets.at(-1).date, '2026-11-15')
  assert.equal(targets[0].sourceWeek, 3)
  for (const options of [{ start: '2026-11-03' }, { start: '2026-11-02', from: 4, through: 2 }, { start: '2026-11-02', mapping: [0,0,2,4,5] }, { start: 'bad' }]) assert.throws(() => lib.assignmentTargets(p, options))
})
test('assignment survives JSON persistence; template and two client copies remain independent', () => {
  const db = fixture(), p = programStarters()[4], original = structuredClone(p)
  const a = lib.prepareAssignment(db, p, options(db), today), b = lib.prepareAssignment(db, p, options(db, 1), today)
  lib.applyAssignment(db, a, today); lib.applyAssignment(db, b, today)
  const saved = JSON.parse(JSON.stringify(db))
  assert.equal(saved.programAssignments.length, 2)
  for (const assignment of saved.programAssignments) assert.equal(assignment.data.schedule.length, 6)
  const pa = saved.prescriptions.find(row => row.id === a.prescriptions[0].id), pb = saved.prescriptions.find(row => row.id === b.prescriptions[0].id)
  assert.notEqual(pa.blocks[0].blockId, pb.blocks[0].blockId)
  pa.blocks[0].exercises[0].sets[0].prescribedReps = 4
  assert.equal(pb.blocks[0].exercises[0].sets[0].prescribedReps, 3)
  assert.deepEqual(p, original)
  p.data.weeks[0][0].name = 'Template change'
  assert.notEqual(pa.name, p.data.weeks[0][0].name)
  const bench = prescription => buildFromPrescription(prescription, { clientId: prescription.clientId, date: prescription.date, resolveTm: name => resolveTrainingMax(saved, prescription.clientId, name, prescription.date).kg }).main.find(e => e.name === 'Bench Press')
  assert.equal(bench(pa).setRows[0].pLoadKg, 80)
  assert.equal(bench(pb).setRows[0].pLoadKg, 160)
  assert.equal(bench(pa).setRows[0].pRepsMax, 5)
})
test('protected dates, past dates, duplicate assignment and concurrent edits fail before any mutation', () => {
  for (const protection of ['workout', 'completed', 'program', 'past']) {
    const db = fixture(), p = programStarters()[0], o = options(db)
    if (protection === 'workout') db.workouts.push({ id: 'protect', clientId: o.clientId, date: o.start, status: 'in_progress' })
    if (protection === 'completed') db.sessions.push({ id: 'protect', clientId: o.clientId, date: o.start, status: 'Completed' })
    if (protection === 'program') lib.applyAssignment(db, lib.prepareAssignment(db, p, o, today), today)
    if (protection === 'past') o.start = '2026-09-07'
    const before = structuredClone(db)
    assert.throws(() => lib.prepareAssignment(db, p, o, today), /protected|past/)
    assert.deepEqual(db, before)
  }
  const db = fixture(), prepared = lib.prepareAssignment(db, programStarters()[0], options(db), today)
  db.prescriptions.push({ ...prepared.prescriptions[1], name: 'Changed by another editor' })
  const before = structuredClone(db)
  assert.throws(() => lib.applyAssignment(db, prepared, today), /calendar changed/)
  assert.deepEqual(db, before)
})
test('replacing unstarted plans requires consent; retry is idempotent and preserves later edits', () => {
  const db = fixture(), p = programStarters()[0], o = options(db)
  const old = { ...lib.prepareAssignment(db, p, o, today).prescriptions[0], name: 'Individual plan' }
  db.prescriptions.push(old)
  assert.throws(() => lib.prepareAssignment(db, p, o, today), /Confirm replacement/)
  const prepared = lib.prepareAssignment(db, p, { ...o, replace: true }, today)
  lib.applyAssignment(db, prepared, today)
  assert.equal(db.prescriptions.find(r => r.date === o.start && r.clientId === o.clientId).id, old.id)
  db.prescriptions.find(r => r.id === old.id).name = 'Client adjustment'
  lib.applyAssignment(db, prepared, today)
  assert.equal(db.programAssignments.length, 1)
  assert.equal(db.prescriptions.find(r => r.id === old.id).name, 'Client adjustment')
})

test('conflicts explain every blocker and distinguish replaceable plans from protected training', () => {
  const db = fixture(), p = programStarters()[0], o = options(db)
  const targets = lib.assignmentTargets(p, o), [a,b,c,d] = targets
  db.programAssignments.push({ id: 'existing', clientId: o.clientId, name: 'Current strength program', data: { schedule: [{ date: a.date }] } })
  db.workouts.push({ id: 'ready', clientId: o.clientId, date: a.date, status: 'ready' })
  db.sessions.push({ id: 'complete', clientId: o.clientId, date: b.date, status: 'COMPLETED' })
  db.prescriptions.push({ id: 'individual', clientId: o.clientId, date: c.date, name: 'Standalone session' })
  // Pending appointments and other clients' training do not block this client.
  db.sessions.push({ id: 'pending', clientId: o.clientId, date: d.date, status: 'Pending' })
  db.workouts.push({ id: 'other', clientId: db.clients[1].id, date: d.date, status: 'completed' })
  const conflicts = lib.programConflicts(db, o.clientId, targets, today)
  assert.equal(conflicts.length, 3)
  assert.deepEqual(conflicts.map(c => c.protected), [true,true,false])
  assert.deepEqual(conflicts[0].reasons.map(r => r.code), ['program','workout'])
  assert.match(conflicts[0].reasons[0].label, /Current strength program/)
  assert.match(conflicts[0].reasons[0].resolution, /edit its client copy/)
  assert.equal(conflicts[1].reasons[0].code, 'completed')
  assert.equal(conflicts[2].reasons[0].code, 'plan')
  assert.match(conflicts[2].reasons[0].resolution, /confirm replacement/)
  const past = lib.programConflicts(db, o.clientId, [{ date: '2026-10-10' }], today)[0]
  assert.equal(past.protected, true)
  assert.equal(past.reasons[0].code, 'past')
  assert.match(past.reasons[0].resolution, /future start week/)
  assert.throws(() => lib.prepareAssignment(db, p, { ...o, replace: true }, today), /protected/)
})
test('legacy conversion keeps original plan and preserves rep ranges; unknown exercises require review', () => {
  const plan = { id: 'old', name: 'Original', items: [{ exId: 'bench', reps: '8–12', sets: 3, rest: '2m' }] }, original = structuredClone(plan)
  const p = lib.legacyProgram(plan, [{ id: 'bench', name: 'Bench Press' }])
  lib.validateProgram(p)
  assert.deepEqual(plan, original)
  const set = p.data.weeks[0][0].blocks[0].exercises[0].sets[0]
  assert.equal(set.prescribedRepsMax, 12); assert.equal(set.prescribedRestSeconds, 120)
  assert.throws(() => lib.validateProgram(lib.legacyProgram(plan, [])), /validate/)
})
test('range validation, propagation and calculations preserve intent without implying exact actual reps', () => {
  const p = programStarters()[0], blocks = p.data.weeks[0][0].blocks, e = blocks[0].exercises[0]
  e.sets = editPrescribedSet(e.sets, 0, 'prescribedRepsMax', 15)
  assert.equal(e.sets[1].prescribedRepsMax, 15)
  e.sets[0].prescribedRepsMax = 4
  assert.throws(() => validatePrescription('Range', blocks), /maximum reps/)
  e.sets[0].prescribedRepsMax = 12
  assert.equal(targetLoadKg('RIR', { ...e.sets[0], prescribedIntensityValue: 2 }, 100), null)
  e.sets[0].prescribedLoadKg = 20
  assert.equal(prescriptionVolume(blocks).hasRange, true)
})
test('template save retries do not bump versions; real edits create a new version', () => {
  const db = fixture(), p = programStarters()[0]; p.id = 'coach-template'
  const first = lib.saveProgram(db, p)
  assert.equal(first.data.version, 1)
  assert.equal(lib.saveProgram(db, p).data.version, 1)
  p.name = 'Edited'
  assert.equal(lib.saveProgram(db, p).data.version, 2)
})
test('remote assignment uses one atomic RPC and never falls back to partial prescription upserts', async () => {
  const prev = fixture(), next = structuredClone(prev), prepared = lib.prepareAssignment(next, programStarters()[0], options(next), today)
  lib.applyAssignment(next, prepared, today)
  const calls = []
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { error: { message: 'Protected date' } } }, from: name => ({ upsert: async rows => { calls.push({ table: name, rows }); return {} } }) }
  const issues = await persistDiff(prev, next, client)
  assert.equal(issues[0].message, 'Protected date')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].name, 'assign_program')
  assert.equal(calls[0].args.p_rows.length, 4)
  assert.deepEqual(calls[0].args.p_expected, [null,null,null,null])
})

const { trainingSchedule, validateTrainingSchedule, programBookingConflicts } = await load('lib/trainingSchedule.js')
const { applyScheduleRequest, scheduleRequest } = await load('lib/schedule.js')
const timedFixture = () => { const db=fixture(); db.clients[0].intake ||= {}; db.clients[0].intake.trainingSchedule={time:'17:30',duration:60}; return db }
const futureOptions = db => ({...options(db),start:'2099-01-05'})

test('Profile timing validates boundaries without reading free-text availability',()=>{
  for(const value of [null,{time:'05:00',duration:60},{time:'23:00',duration:60}]) assert.doesNotThrow(()=>validateTrainingSchedule(value))
  for(const value of [{time:'',duration:60},{time:'24:00',duration:60},{time:'23:30',duration:60},{time:'09:00',duration:0},{time:'09:00',duration:60.5}]) assert.throws(()=>validateTrainingSchedule(value))
  assert.equal(trainingSchedule({intake:{profilePreferences:{values:{timeOfDay:'Evenings'}}}}),null)
})
test('program assignment creates one timed booking per workout and no rest-day bookings',()=>{
  const db=timedFixture(), template=programStarters()[0], original=structuredClone(template), prepared=lib.prepareAssignment(db,template,futureOptions(db),today)
  const prior=db.sessions.length
  lib.applyAssignment(db,prepared,today)
  const bookings=db.sessions.slice(prior)
  assert.deepEqual(bookings.map(s=>s.date),prepared.prescriptions.map(p=>p.date))
  assert.ok(bookings.every(s=>s.time==='17:30' && s.dur===60 && s.clientId===db.clients[0].id))
  assert.deepEqual(template,original)
  const first=bookings[0], request=scheduleRequest(db,first,{...first,time:'18:30',dur:45})
  applyScheduleRequest(db,request,{today,time:'00:00'})
  assert.deepEqual(trainingSchedule(db.clients[0]),{time:'17:30',duration:60})
  assert.deepEqual(db.prescriptions.filter(p=>prepared.prescriptions.some(r=>r.id===p.id)),prepared.prescriptions)
  lib.applyAssignment(db,prepared,today)
  assert.equal(db.sessions.length,prior+bookings.length)
  assert.equal(db.sessions.find(s=>s.id===first.id).time,'18:30')
})
test('a conflict on any program day blocks every booking and prescription, including commit-time races',()=>{
  const db=timedFixture(), p=programStarters()[0], prepared=lib.prepareAssignment(db,p,futureOptions(db),today)
  db.sessions.push({id:'occupied',clientId:db.clients[1].id,date:prepared.prescriptions.at(-1).date,time:'18:00',dur:60,type:'Personal training',status:'Confirmed'})
  const before=structuredClone(db)
  assert.ok(programBookingConflicts(db,db.clients[0].id,lib.assignmentTargets(p,futureOptions(db))).length)
  assert.throws(()=>lib.prepareAssignment(db,p,futureOptions(db),today),/Coach time already occupied/)
  assert.throws(()=>lib.applyAssignment(db,prepared,today),/Coach time already occupied/)
  assert.deepEqual(db,before)
})
test('Profile changes require assignment review and never retime existing bookings',()=>{
  const db=timedFixture(), prepared=lib.prepareAssignment(db,programStarters()[0],futureOptions(db),today)
  db.clients[0].intake.trainingSchedule.time='19:00'
  const before=structuredClone(db)
  assert.throws(()=>lib.applyAssignment(db,prepared,today),/Profile training time changed/)
  assert.deepEqual(db,before)
})
test('timed remote assignments use one transaction without individual booking fallback',async()=>{
  const prev=timedFixture(), next=structuredClone(prev), prepared=lib.prepareAssignment(next,programStarters()[0],futureOptions(next),today)
  lib.applyAssignment(next,prepared,today)
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push({name,args});return {error:{code:'PGRST202'}}},from:table=>({upsert:async()=>{calls.push({table});return {}}})}
  const issues=await persistDiff(prev,next,client)
  assert.equal(calls.length,1);assert.equal(calls[0].name,'assign_program_scheduled')
  assert.equal(calls[0].args.p_assignment.data.initialBookings.length,prepared.prescriptions.length)
  assert.match(issues[0].message,/Nothing was saved/)
})

const {formatTrainingTime,timeFrom12Hour,reconcileTrainingBookings,prepareTrainingPlanSave}=await load('lib/trainingSchedule.js')
const {writePrescription}=await load('lib/planner.js')
test('explicit AM/PM handles midnight and noon correctly',()=>{
  assert.equal(timeFrom12Hour(10,'00','AM'),'10:00');assert.equal(timeFrom12Hour(10,'00','PM'),'22:00')
  assert.equal(timeFrom12Hour(12,'15','AM'),'00:15');assert.equal(timeFrom12Hour(12,'15','PM'),'12:15')
  assert.equal(formatTrainingTime('00:15'),'12:15 AM');assert.equal(formatTrainingTime('12:15'),'12:15 PM')
  assert.equal(formatTrainingTime('10:00'),'10:00 AM')
})
test('Profile save backfills all existing future plans and leaves manual or cancelled bookings alone',()=>{
  const prev=timedFixture(),clientId=prev.clients[0].id,blocks=programStarters()[0].data.weeks[0][0].blocks
  prev.prescriptions=[]
  for(const date of ['2099-01-05','2099-01-06','2099-01-07','2099-01-08','2020-01-01']) writePrescription(prev,clientId,date,structuredClone(blocks),'','Plan')
  prev.sessions.push({id:'override',clientId,date:'2099-01-06',time:'14:00',dur:45,type:'Personal training',status:'Confirmed'},{id:'cancelled',clientId,date:'2099-01-07',time:'17:30',dur:60,type:'Personal training',status:'Cancelled'})
  prev.workouts.push({id:'logged',clientId,date:'2099-01-08',status:'in_progress'})
  const next=structuredClone(prev);next.clients[0].intake.trainingSchedule={time:'10:00',duration:60}
  const request=prepareTrainingPlanSave(prev,next,[clientId])
  assert.deepEqual(request.bookings.map(b=>[b.date,b.time]),[['2099-01-05','10:00']])
  assert.deepEqual(next.sessions.find(s=>s.id==='override'),prev.sessions.find(s=>s.id==='override'))
  assert.deepEqual(next.prescriptions,prev.prescriptions)
  assert.equal(prepareTrainingPlanSave(next,structuredClone(next),[clientId]).bookings.length,0)
})
test('individual builder writes and copied workouts automatically use each client default',()=>{
  const prev=timedFixture(),next=structuredClone(prev),clientId=prev.clients[0].id,blocks=programStarters()[0].data.weeks[0][0].blocks
  writePrescription(next,clientId,'2099-01-05',blocks,'','Individual builder')
  const request=prepareTrainingPlanSave(prev,next)
  assert.equal(request.plans.length,1);assert.equal(request.bookings[0].time,'17:30')
  const saved=structuredClone(next);next.prescriptions.find(p=>p.date==='2099-01-05').notes='Edited'
  assert.equal(prepareTrainingPlanSave(saved,next).bookings.length,0)
})
test('backfill conflict fails before adding any missing booking and names the blocked date',()=>{
  const db=timedFixture(),clientId=db.clients[0].id,blocks=programStarters()[0].data.weeks[0][0].blocks
  for(const date of ['2099-01-05','2099-01-06']) writePrescription(db,clientId,date,structuredClone(blocks),'','Existing plan')
  db.sessions.push({id:'other',clientId:db.clients[1].id,date:'2099-01-06',time:'17:30',dur:60,type:'Personal training',status:'Confirmed'})
  const before=structuredClone(db)
  assert.throws(()=>reconcileTrainingBookings(db,db.prescriptions),/2099-01-06.*Coach time already occupied/)
  assert.deepEqual(db,before)
})

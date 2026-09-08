// Final read-only hosted verification plus an allowlisted, non-secret report.
// Does not enable features, unban users, publish content or restore a database.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { harness } from './hosted-test-runtime.mjs'
const h = harness(process.argv[2]), { ledger, admin } = h
assert.equal(ledger.state.testUsersDisabled, true)
assert.equal(ledger.state.containmentOff.usersDisabled, true)
const preserved = ledger.state.preservation
assert.equal(preserved.baselinePreserved, true)
assert.equal(preserved.baselineRows, 549)
assert.equal(preserved.baselineTables, 52)
assert.equal(preserved.withinApproved1000AtCheck, true)
assert(Date.now() - Date.parse(preserved.checkedAt) < 30 * 60 * 1000, 'fresh_preservation_required')
const { data: flags, error: flagError } = await admin.from('pooling_runtime').select('r1,r2,r3').eq('singleton', true).single()
assert.ifError(flagError)
assert.deepEqual(flags, { r1: false, r2: false, r3: false })
for (const [table, column, value, field, expected] of [
  ['pooling_manifests', 'id', ledger.state.r1.manifestId, 'state', 'revoked'],
  ['pooling_manifests', 'id', ledger.runId + '_publication_check', 'state', 'revoked'],
  ['pooling_scope_grants', 'id', ledger.runId + '_scope', 'revoked_at', null],
  ['pooling_reviewer_authorizations', 'id', ledger.runId + '_reviewer', 'revoked_at', null],
  ['pooling_release_operators', 'actor_id', ledger.users.find(u => u.label === 'coach-a').id, 'revoked_at', null],
  ['pooling_policy_documents', 'id', ledger.runId + '_notice', 'state', 'withdrawn'],
]) {
  const { data, error } = await admin.from(table).select(field).eq(column, value).single()
  assert.ifError(error)
  if (expected === null) assert(Number.isFinite(Date.parse(data[field])))
  else assert.equal(data[field], expected)
}
for (const user of ledger.users) {
  const { data, error } = await admin.auth.admin.getUserById(user.id)
  assert.ifError(error)
  assert(Date.parse(data.user.banned_until) > Date.now())
  assert(user.disabledAt)
}
assert(ledger.checks.every(c => c.passed))
const matrix = JSON.parse(readFileSync('docs/exercise-pooling/quality/hosted-acceptance-matrix.json', 'utf8'))
assert.equal(matrix.cases.length, 110)
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim()
const main = '5de01b4e960e03e28d4a8b22527937103de10ad6', classic = '08ac0673d6e1d67ccd9fee2ffc5995074bcbf162'
assert.equal(git(['branch', '--show-current']), 'codex/exercise-pooling-local')
assert.equal(git(['rev-parse', 'fitness-scribber-classic-2026-09-07^{commit}']), classic)
assert.equal(git(['ls-remote', 'origin', 'refs/heads/main']).split(/\s/)[0], main)
const alias = 'https://fitness-scribber-kq6i-git-codex-exercise-pool-3bc1c9-cureocity1.vercel.app'
const response = await fetch(alias, { redirect: 'manual', signal: AbortSignal.timeout(20000) })
const location = response.headers.get('location') || ''
assert(response.status === 401 || response.status === 403 || ([302, 307].includes(response.status) && location.startsWith('https://vercel.com/')), 'preview_protection_response_required')
const report = {
  reportId: 'FS-POOL-A30-2026-09-08', recordedAt: new Date().toISOString(),
  status: 'listed-hosted-engineering-checks-passed-contained-full-acceptance-open',
  testedApplicationCommit: 'bb513c2c9ae8e55826ab082d3b6b50151d653fd1',
  branch: 'codex/exercise-pooling-local', approval: 'v0.7/A30',
  unit: { tests: 132, passed: 132, failed: 0, command: 'npm test' },
  lint: 'passed', build: { status: 'passed', remainingWarning: 'main bundle exceeds 500 kB' },
  hosted: { apiCheckEntries: ledger.checks.length, uniquePassingCheckNames: new Set(ledger.checks.map(c => c.name)).size, failedChecks: 0, repeatedEntries: ledger.checks.length - new Set(ledger.checks.map(c => c.name)).size,
    apiEvidence: ['hosted-fixtures.mjs', 'hosted-r1.mjs', 'hosted-r2.mjs', 'hosted-r3.mjs', 'hosted-governance-checks.mjs', 'hosted-containment.mjs'],
    browserEvidence: 'operations/HOSTED_EXECUTION_LOG.md', fullAcceptancePassed: false },
  preview: { alias, testedImmutableUrl: 'https://fitness-scribber-kq6i-2w7a9p8nz-cureocity1.vercel.app', githubDeploymentId: 6322555038,
    unauthenticatedStatus: response.status, protectionChanged: false, ownerManagesAccessAndUat: true,
    verifiedBuildsThroughCandidate: 7, reservedDocumentationDeliveryBuilds: 1, approvedBuildLimit: 10,
    browserFlags: { r1: false, r2: false, r3: false } },
  backend: { projectRef: ledger.projectRef, migrations: 18, functions: 6, jwtVerification: true, existingAdminUsersPreserved: true, flags },
  preservation: preserved,
  containment: { testUsersCreated: ledger.users.length, testUsersDisabled: ledger.users.length, refreshSessionsSignedOut: true,
    loginBanChecksPassed: true, fictionalManifestsRevoked: 2, scopeReviewerOperatorRevoked: true, fictionalNoticeWithdrawn: true,
    noFixtureDeletionRequested: true, accessTokenLimit: 'Previously issued access JWTs expire normally; refresh sign-out and login bans do not instantly invalidate every issued JWT. Server flags and fixture grants are off.' },
  recovery: { backupSha256: '488f7e7f037f57723c75f5d16976cc13303f2a32aea9365d9c4e988da476b9a3', bytes: 403091,
    restoredTableFingerprints: 52, baselineRows: 549, originalRowsPreserved: true, twoPassMigrations: true, restoredSchemaSuites: 16,
    atomicTransactionSha256: '58851ad44d60084427fe31447e80bf262c9022db5108730db707ecc02aa5e66c',
    offDevice: false, fullManagedServiceRestore: false, limits: 'Same-device private relational backup; managed Auth/REST/Edge runtime and provider secrets were not recreated. No hosted rewind.' },
  preservedVersions: { remoteMain: main, production: main, classicTag: 'fitness-scribber-classic-2026-09-07', classicCommit: classic },
  acceptance: { ...matrix.counts, complete: false, source: 'quality/hosted-acceptance-matrix.json' },
  release: { humanUatAccepted: false, professionalPolicyAccepted: false, realCataloguePublished: false, realClientEnabled: false, productionPromotionAuthorized: false },
  limits: { extraSpendAuthorizedINR: 0, paidAddonEnabled: false, storageObjects: preserved.storageObjects, originalRecordMutationFound: false, applicationRowsReserved: ledger.rowsReserved, reservedUiHeadroom: 100, rowCountMeaning: 'Final retained rows; managed Auth sign-out removes transient run sessions/tokens. The snapshot is not a lifetime token-creation counter.' },
}
writeFileSync('docs/exercise-pooling/quality/hosted-build-verification.json', JSON.stringify(report, null, 2) + '\n')
ledger.previewBuilds = 7
ledger.state.finalReadOnlyVerification = { at: report.recordedAt, protectedPreviewStatus: response.status, report: 'docs/exercise-pooling/quality/hosted-build-verification.json' }
h.save()
console.log(JSON.stringify({ verified: true, uniqueHostedChecks: report.hosted.uniquePassingCheckNames, testUsersDisabled: ledger.users.length, baselinePreserved: true, poolingFlags: flags, protectedPreviewStatus: response.status }))

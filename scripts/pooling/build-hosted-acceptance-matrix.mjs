// Generates an explicit evidence map, not a claim that every specification ran.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='docs/exercise-pooling/', read=path=>readFileSync(root+path,'utf8')
const cases=[]
for(const file of ['quality/REFERENCE_CASES_AND_TEST_STRATEGY.md','quality/EXTENSION_TEST_SPECIFICATIONS.md']){
 for(const line of read(file).split('\n')){const m=/^\| ((?:TC-\d{3}|R[23]-T\d{2})) \|/.exec(line);if(m){const cells=line.split('|').map(s=>s.trim());cases.push({id:m[1],source:file,scenario:cells[3],expected:cells[4]})}}
}
for(const row of JSON.parse(read('quality/catalogue-coverage-and-cases.draft.json')).cases)cases.push({id:row.id,source:'quality/catalogue-coverage-and-cases.draft.json',scenario:JSON.stringify(row.input),expected:row.expected})
// P = a listed engineering invariant passed at its stated layer; L = partial;
// B = blocked by an unaccepted domain/provider/participant scope. P is not UAT.
const rows=`
TC-001|L|context.test.js; source.test.js|Exact empty legacy movement dataset still needs accepted-case execution.
TC-002|L|context.test.js; source.test.js|Untouched lifestyle and daily-slider combinations not all replayed through the hosted UI.
TC-003|P|context.test.js; hosted-r1.mjs; browser runner|Explicit false and zero preserved; missing stays distinct.
TC-004|P|context.test.js|Mismatched units/protocols rejected; no automatic scale conversion.
TC-005|L|context.test.js|Future-effective input rejected; a dedicated date-mismatch explanation is not emitted by this resolver.
TC-006|P|context.test.js|Later-recorded correction excluded from historical cutoff.
TC-007|P|hosted-governance-checks.mjs|Opposite-side restriction remains unresolved.
TC-008|P|context.test.js|Different protocol cannot satisfy an observation requirement.
TC-009|P|context.test.js|Equal-time conflicting evidence requires review.
TC-010|P|selection.test.js|Pinned/advanced candidate cannot bypass prohibited demand.
TC-011|P|selection.test.js|Missing equipment and unconfirmed prerequisite exclude a candidate.
TC-012|L|selection.test.js; extensions.test.js|Coverage and signal deduplication exist; exact two-findings scoring scenario needs a dedicated fixture.
TC-013|B|catalogue quarantine|No accepted contralateral transformation policy exists; keep it unavailable.
TC-014|P|catalogue.test.js; selection.test.js; hosted-governance-checks.mjs|Admission and withdrawal gates enforced.
TC-015|P|selection.test.js|Explicit advanced/pinned restriction case passed.
TC-016|B|scope gate|Needs accepted individual accommodation policy and expected exercise cases; no blanket clinical enablement.
TC-017|P|selection.test.js; suggestions.test.js|Required missing coverage blocks; no generic fallback.
TC-018|P|selection.test.js|An absent optional role is omitted, not promoted to a required hold.
TC-019|L|selection.test.js; context.test.js|Wrong-variant/missing method checks passed; complete stale/future load-source combinations remain.
TC-020|L|source.test.js; selection.test.js|No unconfirmed load authority; exact default one-rep legacy import still needs acceptance fixture.
TC-021|P|selection.test.js|Exact 95-second arithmetic fixture passed.
TC-022|L|selection.test.js|Over-budget work is blocked; explicit numeric shortfall and coach alternatives are not fully verified.
TC-023|L|migration.test.js; decision.test.js; native-flow.mjs|Draft/copy boundary exists; not every hosted copy/template/cross-client UI path executed.
TC-024|L|decision.test.js; legacy-boundary.sql|Unmapped manual input blocked; paid AI and microphone/voice-provider paths not executed.
TC-025|P|browser canonical generation/swap; hosted-r2.mjs|New revisions remain unassigned until exact approval; old baseline retained.
TC-026|P|native-context.mjs; hosted-governance-checks.mjs|Prior authority cannot clear a new health concern.
TC-027|P|hosted-governance-checks.mjs|Exact side-specific authorization/resolution retains other findings.
TC-028|P|context.test.js; browser runner|Health answer required independently of optional wellness.
TC-029|L|native-concurrency.mjs; hosted stale-editor check|Database race passed locally; no network-interleaved hosted two-tab race certificate.
TC-030|P|hosted-containment.mjs|Hold/off blocks starts; stop and append-only actual corrections preserved.
TC-031|P|context.test.js; gateway.test.js|Required-source failure is unavailable, not an empty eligible result.
TC-032|L|operations.test.js; hosted-r1.mjs|Exact retry and journal behavior passed; browser response loss after commit not injected.
TC-033|L|native-concurrency.mjs|Atomic version guards passed; actual two-coach-browser-tab interleaving not executed.
TC-034|P|authority.sql; hosted-fixtures.mjs; hosted-r1.mjs|Ordinary client cannot promote role, change runtime, approve or call service-only decisions.
TC-035|P|hosted-fixtures.mjs; hosted-r1.mjs|Cross-owner/unlinked valid JWTs denied by all six functions; client source projection restricted.
TC-036|L|hosted-governance-checks.mjs|Client-only core consent and withdrawal passed; optional-sharing lifecycle awaits accepted privacy scope.
TC-037|B|optional-device boundary|No live wearable integration or accepted device-specific processing in this run.
TC-038|P|migration.test.js; hosted-migration-rehearsal.mjs; hosted-preservation.mjs|Two migration passes and all 549 original hosted rows preserved; ambiguous names not remapped.
TC-039|L|migration.test.js; extensions.test.js|Zero and lineage preserved; exact mirrored legacy assessment/max fixture not fully integrated.
TC-040|L|operations.test.js; hosted-containment.mjs|Quota/corrupt storage contract and server-off passed; browser offline network transitions not injected.
TC-041|L|browser desktop/390/768 checks|Native date keyboard entry, labels and reflow checked; full screen-reader/zoom/real-device participant acceptance remains.
TC-042|P|context.test.js; final containment|No professional/launch acceptance inferred; temporary flags/authority disabled.
TC-043|L|review.test.js; source.test.js; hosted-r3.mjs|Explicit timezone/per-session source contract passed; travel timezone UI journey remains.
TC-044|P|context.test.js; source.test.js; canonical browser editor|Unknown adult/health facts block; form choices do not replace reviewed authority.
TC-045|L|selection.test.js; source.test.js|Session-specific inventory required; complete gym-to-hotel/assistance scenario remains.
TC-046|L|context.test.js; selection.test.js|Canonical determinism passed; full locale/device/order permutation suite remains.
CAT-001|P|browser catalogue; catalogue.test.js|All 48 actual catalogue candidates remain unpublished and unassignable.
CAT-002|L|selection.test.js|Fictional anchor prerequisite tested; exact admitted EX-028 domain fixture pending.
CAT-003|B|catalogue quarantine|Accepted seated/standing accommodation cases and exact scope required.
CAT-004|L|selection.test.js|Demand exclusion passed; exact two-variant catalogue case awaits admission.
CAT-005|L|context.test.js; suggestions.test.js|Side/laterality mismatch blocked; exact observation-to-dose mapping fixture remains.
CAT-006|L|selection.test.js|Incremental coverage mechanism exists; exact three-candidate scoring case remains.
CAT-007|P|selection.test.js|Wrong-variant load source cannot resolve prescription.
CAT-008|P|selection.test.js|Beginner label does not satisfy unknown prerequisites.
CAT-009|B|clinical scope gate|Uploaded-file/clinical evidence admission requires separate accepted review; unsupported pathways remain closed.
CAT-010|L|selection.test.js; weekly.test.js|Required gap behavior passed; exact travel/push/pull accepted catalogue fixture remains.
CAT-011|P|selection.test.js|Optional role omission does not block alone.
CAT-012|P|selection.test.js|Exact 95-second fictional arithmetic passed.
CAT-013|P|selection.test.js|Exact 138-second fictional arithmetic passed.
CAT-014|L|selection.test.js|Required budget breach blocked; explicit 100-second shortfall display remains unverified/incomplete.
CAT-015|L|native-concurrency.mjs|Atomic stale race passed locally; not the full hosted two-tab scenario.
CAT-016|L|operations.test.js; hosted-r1.mjs|Receipt replay passed; actual browser dropped-response injection remains.
CAT-017|B|privacy scope gate|Optional clinician-sharing permission and processing pathway are not activated or accepted.
CAT-018|L|native-context.mjs; hosted-governance-checks.mjs|Core withdrawal invalidates authority; complete support/privacy-rights service workflow remains.
CAT-019|P|context.test.js; browser runner|Unanswered health check blocks even without wellness input.
CAT-020|L|operations.test.js; execution.test.js|Pending/offline contracts tested; browser network loss with pending actuals remains.
CAT-021|P|hosted-r1.mjs; hosted-r2.mjs|Minimal client projections exclude raw coach/source evidence.
CAT-022|P|native-catalogue.mjs; hosted-governance-checks.mjs; hosted-containment.mjs|Revocation blocks future reliance without deleting history.
CAT-023|B|finding-mapping quarantine|No accepted diagnostic/corrective mapping; draft associations never supply clinical authority.
CAT-024|P|migration.test.js; hosted-preservation.mjs|Names not used as identity; original references/custom data preserved.
R2-T01|P|numerical.test.js; hosted-governance-checks.mjs|Health hold defeats lighter-dose escape.
R2-T02|L|context.test.js; source.test.js|No scale/default authority; exact lifestyle/slider UI combination remains.
R2-T03|P|context.test.js; gateway.test.js|Failed required source returns unavailable.
R2-T04|B|device boundary|Real/simulated device comparison not enabled or accepted.
R2-T05|P|extensions.test.js; catalogue.test.js|Null/unpublished bounds cannot produce numeric authority.
R2-T06|P|extensions.test.js|Same-lineage effect applied once.
R2-T07|P|native-extensions.mjs; hosted-r2.mjs|Original baseline and retry receipts prevent compounded changes.
R2-T08|P|extensions.test.js|Conflicting effects require review, no averaging.
R2-T09|L|extensions.test.js; selection.test.js|Bounds guard passed; exact 45/50 inventory-rounding fixture not completed.
R2-T10|L|selection.test.js|Budget gate passed; explicit 100-second deficit display incomplete.
R2-T11|L|selection.test.js|Anchor gate passed on fictional metadata; exact admitted equipment transition remains.
R2-T12|B|accommodation scope gate|Accepted client-specific assistant/access policy required.
R2-T13|L|review.test.js; hosted-r2.mjs|Full JSON proposal/diff retained; exact reps+side+duration UX case remains.
R2-T14|P|hosted-r2.mjs; authority.sql|Client cannot accept/assign protected targets.
R2-T15|L|native-concurrency.mjs|Local atomic context-race proof; hosted network race remains.
R2-T16|P|numerical.test.js; hosted-r2.mjs; browser daily no-change|Performed scope and original baseline untouched.
R2-T17|L|operations.test.js; hosted-r1.mjs|Same-key receipt contract passed; browser response-loss test remains.
R2-T18|L|execution.test.js; operations.test.js|Offline/authority contract passed; actual browser offline resume test remains.
R2-T19|B|optional privacy/provider gate|Optional device-sharing withdrawal pathway requires accepted scope and provider integration.
R2-T20|P|catalogue.test.js; final containment|Draft C09 not admitted; synthetic tests do not override release gate.
R3-T01|P|extensions.test.js; native-progression.mjs|Exact comparison identity required; no name-only transfer.
R3-T02|P|extensions.test.js; hosted-governance-checks.mjs|Side equality required; opposite-side review does not resolve left.
R3-T03|P|extensions.test.js|Missing actual not replaced by planned target.
R3-T04|L|source.test.js; selection.test.js|Unconfirmed method rejected; exact one-rep legacy progression fixture remains.
R3-T05|L|weekly.test.js|No invented catch-up day; travel-reason UI history scenario remains.
R3-T06|P|numerical.test.js; hosted-containment.mjs|Health hold blocks new authority while prior results survive.
R3-T07|P|extensions.test.js; catalogue.test.js|Unapproved progression parameters cannot authorize numbers.
R3-T08|L|hosted-r3.mjs|Hosted comparable-history proposal passed with fictional seconds; exact kg/inventory case remains.
R3-T09|L|extensions.test.js; selection.test.js|Bounded loading passed; exact 40/45 kg inventory cap case remains.
R3-T10|P|hosted-r2.mjs; hosted-r3.mjs|Baseline, daily child and progression child remain separate unassigned revisions.
R3-T11|L|extensions.test.js|Conflict/deduplication contracts passed; combined same-occurrence daily+weekly UI race remains.
R3-T12|P|suggestions.test.js; native-progression.mjs|Discovery family never substitutes for compatible laterality/dose/comparison checks.
R3-T13|P|hosted-governance-checks.mjs|Exact field/side/protocol grant required; opposite side untouched.
R3-T14|P|hosted-governance-checks.mjs|Completed workout does not resolve restriction; explicit evidence required.
R3-T15|P|weekly.test.js; hosted-r3.mjs|Explicit slots only; infeasible coverage/support does not invent sessions.
R3-T16|P|weekly.test.js; selection.test.js|Missing required pattern stays blocked.
R3-T17|P|hosted-r3.mjs; native-progression.mjs|Incomparable effort evidence excluded; correction preserves original.
R3-T18|L|native-concurrency.mjs; hosted weekly approval|Atomic batch and hosted positive path passed; hosted new-restriction race remains.
R3-T19|P|hosted-r3.mjs; hosted-containment.mjs|Prior schedule/actuals retained; later review invalidates future reliance only.
R3-T20|P|hosted-r1.mjs; catalogue.test.js; final containment|Client self-approval denied; real C10 not published; release gates remain.
`.trim().split('\n').map(line=>line.split('|'))
assert.equal(cases.length,110);assert.equal(rows.length,110);assert.equal(new Set(rows.map(r=>r[0])).size,110)
const indexed=new Map(rows.map(([id,state,evidence,note])=>[id,{status:{P:'passed-engineering-invariant',L:'partial',B:'blocked-external-scope'}[state],evidence:evidence.split('; '),note}]))
const result=cases.map(c=>{assert(indexed.has(c.id),c.id);const row={...c,...indexed.get(c.id)};row.evidence=row.evidence.map(file=>file==='source.test.js'?'sources.test.js':file);for(const file of row.evidence.filter(file=>/\.(?:mjs|js|sql)$/.test(file)))assert(['tests/pooling/','scripts/pooling/','tests/pooling/sql/'].some(dir=>existsSync(dir+file)),`Missing evidence file: ${file}`);return row})
const counts=Object.fromEntries([...new Set(result.map(r=>r.status))].map(s=>[s,result.filter(r=>r.status===s).length]))
const report={version:'A30-2026-09-08',acceptanceComplete:false,productionReady:false,counts,scope:'Engineering evidence only. Passed means the stated invariant at its listed test layer, not clinical/participant acceptance or every hosted UI variation.',cases:result}
writeFileSync(root+'quality/hosted-acceptance-matrix.json',JSON.stringify(report,null,2)+'\n')
const md=['# A30 acceptance evidence matrix','', '8 September 2026. All 110 preparation specifications are mapped below. **This is not a 110/110 pass certificate.**', '',`Counts: ${Object.entries(counts).map(([s,n])=>`${n} ${s}`).join('; ')}.`, '', 'P = passed engineering invariant at the listed layer. L = partial; named work remains. B = blocked by external scope/review. None is professional or human UAT acceptance. Test filenames refer to `tests/pooling/` or `scripts/pooling/`; browser evidence is in the hosted execution log. Historical spec documents are not rewritten as executed tests.', '', '| Case | Result | Evidence | Outcome / remaining work |','|---|---|---|---|',...result.map(r=>`| ${r.id} | ${{'passed-engineering-invariant':'P',partial:'L','blocked-external-scope':'B'}[r.status]} | ${r.evidence.join('; ')} | ${r.note} |`), '', '## Remaining verification gate', '', 'Before promotion, complete the L cases at the required layer and resolve B cases only for the expressly admitted launch scope. Highest priority: hosted two-tab/race and response-loss/offline injection; every supported builder/copy/template/voice entry point; explicit budget-shortfall explanations; exact accepted catalogue/equipment/loading cases; screen-reader/real-device and participant UAT. No production promotion is authorized by this matrix.','']
writeFileSync(root+'quality/HOSTED_ACCEPTANCE_MATRIX.md',md.join('\n'))
console.log(JSON.stringify({mapped:result.length,counts,acceptanceComplete:false}))

# A34 — content and release-readiness reconciliation

9 September 2026. This is a review of the exact local artifacts and recorded approvals, not new medical/legal guidance, a publication action or a replacement for the owner's completed review.

## What remains accepted

The owner's review of all six PRDs and twelve catalogue artifacts remains accepted, with no requested amendments. Preparation and engineering implementation authorization are not being reopened. Older wording inside the preparation files (for example, `implementationAuthorized: false` in the historical R2/R3 preparation JSON) describes that draft's original preparation boundary; it does not negate the subsequent build approval.

## What the current executable inputs actually contain

| Artifact | Exact inspected state | Consequence |
|---|---|---|
| `exercises.draft.json`, FS-POOL-S1S2-0.2 | 48 candidates; all 48 have empty `approvalEvidence`; zero automation-eligible exercises; `productionEnabled: false` | These are browsable candidates, not a real published exercise pool. No publication attempted. |
| `rules-and-templates.draft.json`, v0.2 | 15 protocols, 20 needs, 20 policies, 10 dose drafts, 7 goals, 20 families, 8 session templates; package approval evidence empty | Exact executable release membership, accepted parameters, scope and evidence still have to be supplied before real automated selection. |
| `finding-mappings.draft.json`, FS-POOL-S1S2-0.2 | 18 mappings; production disabled | Owner-reviewed draft reasoning is retained; no diagnosis or client clearance is inferred. |
| `daily-adjustment.draft.json`, v0.1 | 14 rules; seven null parameters: baseline policy, signal trigger, permitted fields, change bounds, effort method, conflict policy and rounding policy | Numerical real-world daily adjustment cannot be inferred from these nulls. |
| `progression-planning.draft.json`, v0.1 | 14 rules; 15 null parameters covering comparison, evidence, success/difficulty, permitted fields, progression/regression, adjusted targets, rounding, reassessment, weekly structure/distribution/recovery and conflicts | Real-world progression/planning needs exact accepted values and their applicable scope. |
| `sources-reasons-vocabulary.draft.json`, FS-POOL-S1S2-0.2 | 24 sources and 32 reasons; production disabled | Source references and procedural vocabulary do not themselves provide rights or professional acceptance. |

The 12 review artifacts are not 12 standalone runtime JSON files; some are grouped in these packages and supporting administration/review/coverage documents. No artifact is silently marked professionally accepted just because its parent document was owner-reviewed.

## What can be tested now

The existing backend-created fictional workspace has a narrowly scoped published **software-placeholder** release. That release can exercise source confirmation, generation/swap, validation, explicit approval, sessions/results, daily arithmetic, comparable-history progression and weekly scheduling. Its placeholder movements must not be performed. This is not proof that realistic adult/advanced/adaptive/rehabilitation onboarding produces accepted real exercise prescriptions, and it is not independent coach/client UAT.

The UI now distinguishes the admitted workspace policy from the separate historical draft-catalogue warnings. This removes a confusing apparent blocker without inventing parameter values or changing publication permissions.

## Release decisions still separate from this test

1. Pin the intended real exercise/mapping/dose/policy revisions and accepted population/settings. Record actual applicable reviewer identity, decision, evidence and rights basis; do not fabricate signatures or infer clinical approval from product review.
2. Supply missing operating facts and final applicable privacy/consent/retention/rights/incident decisions. Optional clinician/device sharing can remain excluded rather than being silently enabled.
3. Obtain real participant/device/browser and agreed performance acceptance; automated checks are engineering evidence only.
4. Name an authorized off-device backup destination and exact managed-service recovery target if full disaster recovery is required. Existing same-device recovery evidence remains valid within its recorded scope.
5. Make a separate limited-pilot and later main/Production/real-client release decision. A protected Preview push is not that decision.

These items belong in the final review list. None authorizes publishing the 48 real candidates, guessing null numerical parameters, reopening retired accounts, removing quota/expiry checks, or using a software fixture as real consent.

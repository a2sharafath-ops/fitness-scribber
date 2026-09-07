# S1–S2 traceability and document verification

FS-POOL-S1S2-0.2 · v0.2 · 2026-09-05. This record distinguishes document checks from future application tests and professional review.

**Historical preparation snapshot.** For the 7 September local build, see [current application evidence](../operations/LOCAL_BUILD_VERIFICATION.md) and [requirement-to-engineering-test coverage](./local-build-verification.json). The older results below are not current claims that no code/tests/build approval exist. Domain expected-result specifications and actual professional acceptance remain distinct from executed synthetic engineering tests.

## Requirement traceability

| Requirement | Source/design contract | Catalogue/rule examples | Expected-result specifications |
|---|---|---|---|
| REQ-001 coach approval | P04; E02 atomic assignment | POL-013 | TC-023–025, 029, 034; CAT-015 |
| REQ-002 separate level/access/clinical state | D01/D04; module requirements | POL-001/009/015; access cases | TC-015–016, 044–045; CAT-003–004, 008 |
| REQ-003 unknown not normal | D01/D02; P02 | PRO-03/09/12/13; MAP-16 | TC-001–004; CAT-008, 019, 023 |
| REQ-004 dated evidence/replay | D02; detailed engine contract | MAP-15/16; POL-002 | TC-005–009, 046; CAT-023 |
| REQ-005 eligibility before ranking | P03; engine stage order | POL-004/007/008/009 | TC-010–018; CAT-001–004 |
| REQ-006 identity/review | D03; schema; migration design | EX IDs/revisions; C12; POL-007 | TC-014, 038; CAT-001, 022, 024 |
| REQ-007 side/coverage | D03; C03; P03 | MAP-01–18; NEED-09/10; POL-016 | TC-007, 012–013, 021; CAT-005–006 |
| REQ-008 equipment/time | P04; C08; UX composer | POL-008/012/015; DOSE-01–09 | TC-011, 017–018, 021–022, 045; CAT-002, 010–014 |
| REQ-009 dose provenance | D01 strength sources; P04 | PRO-05; DOSE-02/03; POL-011 | TC-019–020; CAT-007, 013 |
| REQ-010 clinical scope | D04; handoff; professional review | PRO-15; POL-006; SESSION-08 | TC-015–016, 026–027; CAT-003, 009 |
| REQ-011 all entry points | E04 integration matrix; U01/U02 | POL-003/013/014 | TC-023–030, 040, 043; CAT-015, 019–020 |
| REQ-012 immutable history/reapproval | D04; E03; revision lifecycle | POL-013; retire/revoke workflow | TC-025–030, 038–039; CAT-015, 022 |
| REQ-013 appropriate explanations | U02; API projections | C11 32 reason codes | TC-035, 041; CAT-021 |
| REQ-014 genuine consent | Q05; consent/rights workflow | POL-017; PURPOSE-05/08 | TC-036; CAT-017–018 |
| REQ-015 actual data flows | Provider inventory; regional/processing packs | C12 regional/technical sources | TC-035–037; CAT-021 |
| REQ-016 visible failures | E05; U02 failure table | POL-014; C11 save/conflict codes | TC-031–033, 040, 046; CAT-016, 020 |
| REQ-017 preservation | E03 migration specification; local audit | Legacy quarantine; immutable EX revision | TC-038–039; CAT-024 |
| REQ-018 scoped release authority | Approval record; manifest; backlog | All production/admission flags false | TC-042; CAT-001 |

Complete field-level lineage is in D01; source resolution in D02. Tables above identify representative content and tests, not a claim that a fixture proves clinical validity. Clinical reviewers must accept/amend expected domain results and supply missing supported-module cases.

## Verification scope

The document-only checker validates the five JSON datasets against their supplied strict structural definitions, unique IDs, references, role/equipment vocabulary, draft/approval flags, 63 coverage rows, 24 CAT records, all 70 backlog task IDs/dependencies, artifact/output paths and relative Markdown links. It verifies 31 S1/S2 preparation statuses while ensuring acceptance/build gates stay pending. It also checks the backlog dependency graph for cycles.

The checker uses no app imports, hosted network, credentials or client data and writes no files. It is not a selection-engine prototype, prescription generator, database permission test or clinical validator. The schema is tailored to these draft documents; a later published runtime schema must be separately reviewed. Schema-valid content is not automatically correct or fit for use.

Run command from the project root: `node docs/exercise-pooling/quality/validate-preparation.mjs`. Actual results are saved in [verification-results.json](./verification-results.json). Document checks must finish without errors before this preparation handoff is considered internally verified.

## What has not been executed or accepted

- No pooling unit/integration/browser/accessibility suite; the 46 TC and 24 CAT records remain test specifications.
- No actual expert content/clinical/rights/privacy acceptance, G1/G2 sign-off or A12 build permission.
- No hosted schema/RLS inspection, migration/restore rehearsal, performance benchmark, app build/lint run, real-client pilot or deployment.
- No claim of medical effectiveness, validated instrument adoption, worldwide legal compliance or approved production catalogue coverage.

The baseline source audit confirmed 209 exercise and 42 corrective entries and recorded their source hashes. Git working-state inspection must show no tracked application changes from this work. Review materials and optional archive contain only this preparation package; the older Word snapshot remains separately preserved.

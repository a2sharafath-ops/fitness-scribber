# Draft catalogue schema and interpretation

C01–C08, C11–C12 · v0.2 · not a runtime seed or exercise prescription.

## Files and artifact mapping

| File / collection | Artifact | Meaning |
|---|---|---|
| exercises.draft.json / exercises | C01 | 48 original variant candidates with demands, exact kit, prerequisites, positions, instructions and linked needs/doses/policies |
| rules-and-templates.draft.json / protocols | C02 | 15 protocols/source types; units, comparability and limitations |
| rules-and-templates.draft.json / needs; finding-mappings.draft.json | C03 | 20 functional needs plus explicit observation-to-review/confirmation mappings |
| rules-and-templates.draft.json / policies | C04 | 20 procedural screening/restriction/authority proposals; no adopted numerical clinical triage |
| rules-and-templates.draft.json / goals | C05 | Seven goal pathways and coach-selected weekly slot rules |
| rules-and-templates.draft.json / doses | C06 | Ten populated dose schemas; unresolved client values stay unresolved |
| rules-and-templates.draft.json / families | C07 | 20 discovery families; family membership is not substitution equivalence |
| rules-and-templates.draft.json / sessions | C08 | Eight single-session compositions with time and required-gap behavior |
| sources-reasons-vocabulary.draft.json / reasons | C11 | 32 codes with state, audience-safe copy and next action |
| sources-reasons-vocabulary.draft.json / sources | C12 | 24 provenance/evidence/rights references and verification limitations |
| quality/catalogue-coverage-and-cases.draft.json | Q01/Q03 | 63 goal × setting × level rows, seven access/specialty cases and 24 additional synthetic cases |

## Identity, revisions and draft boundaries

IDs are stable within this proposal namespace, not existing database IDs. `EX-015` identifies a variant; its revision identifies the immutable content. `FAM-squat` discovers related candidates. A prescription occurrence requires its own ID. Never use a translated name as any of these identities. An actual migration must preserve old IDs and explicit mapping evidence.

Every content record has revision 1, draft review status, empty approval evidence and `automationEligible:false`. The package has `productionEnabled:false`. These flags are descriptive draft safeguards, not implemented runtime enforcement. Sources are references, never inherited approval. No source or family can approve its descendants by implication. The strict draft schema deliberately rejects populated approval evidence or enabled production; a later published schema needs separate review.

Exercise `levels` describe intended review coverage, not a hard population cutoff or skill proof. Required task prerequisites still apply. `settings` lists plausible locations only; every equipment/support item must be confirmed for the actual session. Band type, anchor rating, load increments, seat height, assistance and clearance are not inferred from “home” or “full gym.” An equipment-empty candidate still needs the route/space/task prerequisites stated in its record.

`laterality:unilateral` is a catalogue capability, not an execution-side value. Prescriptions must separately record observation side, target side, execution side and `per_side`/`total` dose basis. Catalogue candidates can be matched across levels only within reviewer-approved scope; do not label all seated options beginner or all disabled clients clinically restricted.

## Required population and restriction review

Demand tags are review inputs, not an exhaustive clinical contraindication ontology. The record's common restriction-policy references ensure active restrictions, new concerns, clinical scope, skills and access are checked. Reviewers must add any scope-specific contraindications/modifications before admission. Free-text diagnosis matching is forbidden. All condition-specific rehab remains unsupported in this draft subset, including postoperative, neurological, cardiac and pregnancy-specific protocols.

Need mappings encode questions and confirmed task goals, not claims that a postural observation proves a muscle is weak, tight or injured. Observation severity does not invent dose. A source can produce several hypotheses but cannot amplify ranking by duplication. Resolution is scoped to task/side/evidence lineage; a partial reassessment cannot clear omitted findings.

## Dosing and time accounting

The dose catalogue specifies decisions/fields and worked synthetic arithmetic. It deliberately does not set universal client dosage. Before assignment, coach-selected values must fall within the accepted exercise/clinical policy scope and have the appropriate provenance. A generic exercise reference does not validate the illustrative fixture numbers.

For repetition work: sum actual work per set, rest between sets, rest between sides where applicable, setup, equipment changes and transfers. For repeated unilateral work, multiply only components declared per side; shared setup is counted once. For timed work, distinguish total duration from per-side duration. A distance needs an explicit planning-speed estimate; unknown duration blocks claims that a required session fits. Do not double-count a single exercise serving two roles.

Example: two sets of eight repetitions at three seconds, one 60-second inter-set rest and 30-second setup = 138 seconds. Example: one 30-second carry each side, 15-second change and 20-second setup = 95 seconds. Remaining time is visible; no filler is required to reach a 30-minute budget.

## Validation and review layers

1. Document-schema check: types, required keys, explicit draft flags and allowed values; unique IDs and cross-references; no unknown role/equipment IDs; all requested dimension rows represented.
2. Semantic review: prerequisites, scope, completeness, side/time compatibility, alternatives and source rights. A structurally valid record can still be unsuitable.
3. Qualified acceptance: exact record revision, reviewer competence/scope, amendments and review triggers, source permission evidence. Empty evidence means pending.
4. Future build: runtime admission, permission, concurrency and behavior tests. None are executed by document checks.

See [review and maintenance](./REVIEW_AND_MAINTENANCE.md), [source audit](./SOURCE_RIGHTS_AND_LEGACY_AUDIT.md) and the [verification record](../quality/TRACEABILITY_AND_VERIFICATION.md). Draft schema is in catalogue.schema.json; validation checks documentation only.

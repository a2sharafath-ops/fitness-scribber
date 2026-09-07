# D03 — identifiers, vocabulary and units

Version 0.1, 2026-09-05. FP-104 drafting specification; no migration or catalogue publication. Addresses REQ-002, 006–009 and 017.

## Identities are different things

| Identity | Meaning / proposed rule |
|---|---|
| Catalogue exercise ID | Stable opaque ID for one defined exercise variant; never rebuilt on page load or identified solely by name. |
| Catalogue revision | Immutable content version including setup, prerequisites, roles, dosing references, sources and review scope. Cosmetic versus consequential change recorded explicitly. |
| Family ID | Reviewed substitution relationship; belonging to one family does not prove equivalence for every need. |
| Workout exercise occurrence ID | One occurrence inside a specific draft/session; can differ while referring to the same catalogue version. Existing `exerciseId` often means this, not catalogue identity. |
| Block/set occurrence IDs | Ordered programme instances, kept distinct from exercise and dose-template identities. |
| Finding/protocol/item IDs | Versioned observation definitions, independent of exercise or muscle names. |
| Restriction/need/approval IDs | Separate records and lifecycles; removing a need never silently removes its source restriction. |
| Evidence event/revision IDs | Preserve source lineage and distinguish correction from a new measurement. |

Legacy `exerciseDbRef` maps via an explicit migration ledger. An unresolved or many-to-one collision is reviewed, not guessed. Renaming an exercise preserves its ID; changed execution semantics may require a new variant/revision. Keep original display labels on historical workouts. Coach overrides are versioned separately from imported content and must not be overwritten by a library refresh.

## Pool role vocabulary

| Proposed role ID | Plain meaning | Possible existing block host, not a mandatory placement |
|---|---|---|
| `general_warmup` | General preparation for the session | Warm-up |
| `mobility_lengthening` | Reviewed mobility or stretching role | Warm-up or Cool-down |
| `smr` | Reviewed self-myofascial-release role | Warm-up or Cool-down |
| `activation` | Targeted preparatory strength/control role | Warm-up or Core/Others |
| `integration` | Reviewed movement-pattern practice combining needs | Warm-up, Main Lifts or Core/Others |
| `main_accessory` | Goal-directed main/supporting work | Main Lifts, Assisted or Core/Others |
| `conditioning` | Reviewed cardiorespiratory/work-capacity role | Main Lifts or another explicitly labelled block |
| `cooldown` | Session-ending role | Cool-down |

One variant can have multiple reviewed roles. Eight pools are not eight required blocks; SMR or stretching is not universally mandatory. Existing block labels describe layout, not eligibility. In R1 preserve current navigation/block compatibility, with a role annotation rather than assuming a whole UI redesign.

## Other namespaces and semantics

| Namespace | Draft approach |
|---|---|
| Pattern | Normalize aliases for squat, hinge, lunge, horizontal/vertical push/pull, carry, rotation/anti-rotation, locomotion and other reviewed patterns. This is a schema seed, not proof the present library covers them. Do not turn `Corrective` into an anatomical movement pattern. |
| Muscle/joint/region | Stable IDs, labels and aliases reviewed per record. Keep anatomical structures, muscle groups and inferred functional roles distinct. “Opposite side” requires an explicit reference finding/side transformation. |
| Equipment | Specific items plus accessories, support/anchoring, resistance range, space and assistance requirements. `bodyweight` is a loading mode, not proof no environment requirements exist. |
| Goals | Canonical category, client text, priority and active period. Existing labels map only after human confirmation; rehabilitation is a service context, not a permission flag. |
| Experience | Beginner/intermediate/advanced independent of individual prerequisite evidence, functional needs and clinical scope. |
| Side | left, right, bilateral, midline, alternating, unspecified, not_applicable. Bilateral observed presence differs from performing a bilateral exercise. Unspecified never silently expands to both sides. |
| Scope | General, individually adapted, clinician-guided, unsupported/review-required are workflow contexts, not diagnosis labels. Modules state supported use cases and markets separately. |

For sided prescription record observation side, target structure/side, movement execution side and dose basis (`per_side` or `total`). A contralateral drill cannot be mapped by name alone. A reviewed transform must say which side is moving/supporting and why.

## Units and missingness

Canonical values use kg, seconds, minutes where explicitly named, centimetres or degrees according to protocol, bpm, and ms. Preserve entered unit, converted value and conversion version. Per-hand/per-side/total load must be explicit; a dumbbell label alone is insufficient. Round a proposed load only to confirmed available increments and show the result; rounding must not exceed a reviewed limit.

Retain ordinal scale ID, min/max and direction. Sleep quality 1–7, stress 1–7 and categorical intake ratings are not interchangeable. `hydrationL` in body composition and lifestyle must map to different canonical fields. Null = no numeric value, not zero. Store range, unparsed text, unknown and not-applicable explicitly rather than choosing a midpoint.

Catalogue/reference retirement prevents new automated selection while retaining historical resolution. Version revocation for a material issue triggers review of affected future approvals; a mere label correction does not rewrite them. Candidate aliases, final pattern/muscle/equipment registries, imported rights and variant mappings remain S2 work.

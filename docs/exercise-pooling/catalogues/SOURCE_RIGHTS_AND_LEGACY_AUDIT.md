# Source, rights and legacy admission audit

C12 / FP-201 · local read-only audit, 2026-09-05. No hosted data or media downloaded.

## Local findings

| Source | Observed facts | Required disposition |
|---|---|---|
| src/lib/exerciseLibrary.js | 209 entries; 181 Intermediate and 28 Advanced; no record has a stable `id`; 126 have `relPct` | Do not auto-admit. Preserve original records/history; propose explicit variant mappings and reviewed load provenance. |
| src/lib/correctiveLibrary.js | 42 entries, all Beginner; no stable `id`; SMR/stretch/activation labels and target associations | Review each association, indication, dose and scope. Beginner is not evidence of suitability. |
| Imported metadata examples | Goblet Squat and Ring PushUps (Normal/Wide) labelled Barbell; DB Curls labelled Back with percentage relative to Pull-Up | These are concrete ambiguity/error-review cases, not safe automatic equipment/load conversions. |
| src/lib/parq.js | Local instrument label PAR-Q+ 2024; app-derived clearance logic | Verify exact adopted version, permission, scoring/branch integrity, language and clinical policy. Do not copy the protected wording into new drafts. |
| Assessment/posture implementation | Named findings, severity and muscle associations; missing values/defaults can appear settled in UI | Record observation state and provenance; treat muscle links as unconfirmed hypotheses. No diagnostic validity inferred. |

Snapshot SHA-256: exercise library `69dbe0bfbfb6c071173e05fc242e3a4a4fa0e8d51e73ededc36238150a1c9348`; corrective library `fbdbd676b74b1b3a6d343f05e892890d49f929d6fca19022ea9da503f5a41e9a`. Counts came from the static exported arrays in an isolated evaluation, not from loading the app or any client storage. Later source edits require a new audit.

The 48 new candidates are original review descriptions, not a claimed completed repair/import of the 251 existing records. No media was included. Existing custom exercises, copyrighted materials and historical names are preserved in the application; this work changes none of them.

## Evidence and rights conclusions

- [WHO guidance](https://www.who.int/publications/i/item/9789240015128) provides population-level context, not individual clearance or an exercise catalogue licence.
- [ACSM's current position-stand index](https://acsm.org/education-resources/pronouncements-scientific-communications/position-stands/) identifies the healthy-adult resistance-training evidence review. The full linked article was unavailable in this check. Exact dose claims were therefore not extracted; our numeric examples test time arithmetic only.
- [PAR-Q+ terms](https://eparmedx.com/?page_id=746) were visible through official indexed results, while the full page returned 403. Commercial incorporation permission is unresolved; [citation guidance](https://eparmedx.com/how-to-cite/) alone is not permission. Rights reviewer must obtain the current terms and written permission or another lawful basis for the exact intended use. Do not infer permission to adapt or translate an instrument.
- The regional and technical source records describe what was checked and what remains unavailable. No source search has established professional acceptance, a service licence, an approved hosting region or permission to launch.

## Rights decision required per reusable asset

Capture owner, original URL/file/version, author, exact content imported, intended commercial/display/adaptation/translation use, geographic/channel limits, licence or permission evidence, attribution obligation, expiry/change trigger and reviewer. Record `approved`, `restricted`, `rejected` or `unknown` with evidence; unknown is not admitted. Media rights are evaluated separately from text and exercise facts.

If PAR-Q+ incorporation cannot be licensed, do not silently rename or rewrite it and call it validated. Product/domain/rights reviewers must select a lawful instrument or separately reviewed original intake workflow and explicitly accept its limitations. This is a future decision, not a change implemented here.

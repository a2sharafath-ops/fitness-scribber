# D02 — client-context resolution contract

Version 0.1, 2026-09-05. Proposed design for FP-103; not implemented or clinically approved. Inputs are mapped in [D01](./FIELD_DICTIONARY.md); required behaviours trace to REQ-002–005, 007–010, 012 and 016–017.

## Observation model

Every usable fact needs: client ID; field/item and side; raw value and scale/unit; observation state; origin record/revision/field; source kind; recorded-by actor and reporter (which may differ); effective date/time plus precision/timezone; recorded timestamp; confirmation actor/time/method; applicable protocol/version; supersession/correction links; and quality/validation issues. Legacy unknown metadata remains unknown. A coach entering a client's report is not the same as a coach measuring the value.

Keep three separate dimensions rather than one overloaded “valid” flag:

| Dimension | Proposed values | Meaning |
|---|---|---|
| Observation | unknown, not_assessed, observed_present, assessed_absent, measured, reported, not_applicable, declined | Absent requires an actual scoped negative assessment; not_applicable needs a reason/routing rule. Declined does not mean absent. |
| Confirmation/quality | unconfirmed, confirmed, invalid, legacy_ambiguous, simulated | Confirmation proves an assertion was made, not medical truth. Defaults and simulation never become confirmed by inference. |
| Resolution | usable, missing, stale, conflict, unavailable, unsupported | Derived for a specific consumer and session; a fact may be displayable but unusable for dose. |

`false` and `0` are legitimate values when explicitly supplied in the correct scale. Do not test missingness by truthiness. Untouched controls may stay blank or be explicitly confirmed at submit; moving a slider is not the only acceptable confirmation mechanism. “Confirm all assessed items” is permitted only with a visible selected scope; never includes collapsed/unassessed sections silently.

## Resolution order (proposed RES-01–RES-10)

1. **RES-01 — access and availability:** resolve authorized client and permitted purpose first. A denied/failed source query is `unavailable`, not an empty successful result. No client-provided coach ID grants access.
2. **RES-02 — normalize without inventing:** preserve raw data, validate units/enums/scale, map only unambiguous approved aliases. Keep unparsed pain, goals and ROM text for review, not a language-model diagnosis.
3. **RES-03 — temporal scope:** use session-effective context, a knowledge cutoff and an explicit timezone. Exclude observations effective after the target session. For historical replay use only revisions known at the original decision; later backdated corrections are separately labelled retrospective re-evaluations.
4. **RES-04 — lineage:** link mirrored body-comp/client snapshots and workout/max/fitness rows to the same evidence event where known. Deduplicate lineage, not merely equal values. Equal independent reports can coexist; unknown lineage stays visible.
5. **RES-05 — conflicts:** compare facts only when field, period, side, protocol and units are compatible. Apply the field rules below. Equal-time contradictory facts require review; a lexicographic ID must never choose medical truth.
6. **RES-06 — persistent constraints:** retain active/unresolved restrictions across missing, old or incomplete assessments. Only an authorized scoped resolution supersedes a restriction. An ended validity window can require review; it is not evidence that a limitation has disappeared.
7. **RES-07 — usefulness/freshness:** use versioned field- and purpose-specific freshness rules. No universal 30/84/365-day expiry. Missing policy permits historical display but not an unsupported claim of current dose eligibility. A confirmed recheck can refresh only the fields actually checked.
8. **RES-08 — session overlay:** merge coach-reviewed session goal/setting/equipment/time and current health-change information over baseline as applicable. An overlay cannot relax clinical limits or change actual history.
9. **RES-09 — needs and eligibility:** apply only approved mappings to sufficiently reliable observations; preserve hypotheses separately from confirmed functional needs. Session gate precedes exercise eligibility and ranking.
10. **RES-10 — freeze and trace:** emit a versioned context snapshot, input revision references, resolutions/reasons, missing items and permitted next actions. No I/O or source mutation during resolution.

## Field-specific source rules

| Domain | Proposed resolution | Not permitted |
|---|---|---|
| Age/adult scope | Confirmed DOB evaluated at reference date, or dated age declaration with uncertainty; discrepancies require correction | Infer age from appearance/name, use default 30, or assume unknown adult |
| Anthropometrics | Most recent compatible confirmed measurement effective by session, or explicit dated coach-selected override with rationale; identify mirrors | Permanent precedence for undated client snapshot or mixing body water with daily hydration |
| Lifestyle | Most recent confirmed report for the intended baseline period, per field. Preserve older values as historical; categorical intake answers stay categorical | Convert poor/fair/good into invented 1–7 numbers; substitute wearable sleep for reported sleep quality |
| Goals | Coach-reviewed active goal set with client-stated priority; newer self-report creates a proposed change until reconciled | Free-text goal interpreted as clinical clearance; automatic ordering from array position alone |
| Experience/skill | Confirmed overall experience plus exercise-specific prerequisite evidence | Equate “experienced,” Beginner default, a self-rating or disability label with tested capability |
| Equipment/time | Confirmed session-specific inventory/time first, then explicitly reconfirmed setting-specific baseline; required accessory/load/assistance checks | Assume all equipment from “full gym,” or reuse home kit on a travel day |
| Movement | Same protocol/version/item/side and assessment coverage; present needs persist as unresolved when later item was not assessed | Clear left-side finding because right side was tested, or compare unlike protocol percentages as equivalent |
| Symptoms/pain | New relevant report creates a review event immediately, even before coaching interpretation; clinical actions follow approved policy | Let old “no pain,” good wellness, completion status or missing note erase the report |
| Clinical instructions | Versioned evidence with client, author/authority, issue/effective/review dates, permitted activity, prohibitions, dose/supervision limits and scope | Uploaded letter or `received` flag interpreted as unrestricted clearance |
| Strength/load | Coach-selected, dated, exercise/variant-specific reference with known method/units; reviewed policy defines precedence between eligible TM, stated/measured/estimated test and observed history | Name substring cross-lift transfer, unlimited-age assessment fallback, fabricated rep count, or using future assessment |
| Daily wellness | Explicit current report and date/time; same-period conflicting duplicates require resolution; old report stays old | Substitute lifestyle baseline, average conflicting duplicates, or treat skipped input as low/normal readiness |
| Wearables/history | R1 display only; future R2/R3 require quality, authorization, compatible metric/method and deduplicated lineage | Simulated/manual records labelled device evidence; readiness/ACWR treated as clearance |

Optional missing data does not blanket-block the client. The reviewed requirement contract decides which actions require each field: missing body fat need not block a bodyweight draft; missing required equipment makes that candidate unverified; missing required screening prevents assignment/start under the proposed gate. A consumer must expose why it requires a field.

## Date precision, future planning and travel

Date-only historical observations retain date precision. Do not create midnight or exact ordering evidence by guessing. If same-day order matters and cannot be established, require confirmation. Planned sessions may use available baseline for provisional drafting but must recheck at assignment and start; future-day health answers are not accepted as today's confirmation. Session date/timezone changes invalidate affected approvals. An ordinary fresh health-change answer before each start is separate from once-per-day optional wellness. Multiple sessions on one day have separate start checks.

Knowledge cutoff makes two questions explicit: “What did we know when approving?” and “What would we conclude now?” Both can be supported without rewriting the original record. Client relocation/travel also requires service-market review where relevant; this resolver does not decide legal practice authority.

## Worked cases

| Case | Inputs | Expected resolution |
|---|---|---|
| RES-A | No movement keys in an old `nasm` row | Legacy ambiguous/not assessed; no clean bill of movement health; generic eligible training need not depend on invented findings |
| RES-B | Left finding present; later assessment only tests right | Left remains unresolved; right resolves independently |
| RES-C | Older completed screening plus new relevant symptom report | New review event; old clearance does not automatically cover it |
| RES-D | Assessment effective Oct 1; drafting Sep 5 | Exclude from Sep 5 source candidates; show invalid source reference if injected |
| RES-E | Backdated Aug 1 measurement entered Sep 5; replay Aug 2 decision | Exclude from original replay by knowledge cutoff; optional retrospective result labelled separately |
| RES-F | Intake stress `high`; assessment stress `4/7` | Separate measurements/scales; compare qualitatively only with reviewed basis, not numeric conversion |
| RES-G | Empty lifestyle form saved with quality/stress 4 and Moderate | Preserve recorded raw defaults with legacy ambiguity; request current confirmation, not fake prior consent |
| RES-H | Equipment table fetch failed versus explicit confirmed no equipment | First unavailable; second usable bodyweight context, still verify any support surface |
| RES-I | Coach corrects an incorrectly entered side | New correction revision with provenance; invalidate affected future decisions, preserve original history |
| RES-J | User declines optional wearable integration | No wearable score; no penalty/forced integration; core R1 unaffected |

Open: adopted protocol/rights, field freshness, clinical hold-resolution authority, exact required fields by supported module, and compatibility of historical strength variants. These require product/domain review; this contract supplies no new clinical cutoff.

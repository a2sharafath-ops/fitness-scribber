# C09/C10 parameter and evidence review dossier

Version 0.1 · all rules and parameters unapproved. The populated rule catalogues describe decision behavior; this dossier specifies what each unresolved policy value must mean before it can be adopted.

## Parameter specifications

| Parameter | Required structure / unit | Required review decision |
|---|---|---|
| baselinePolicy | Source/method/scale, comparable window in days or sessions, minimum confirmed observations, missingness and change invalidators | Appropriate comparison population and sufficient baseline; no universal wearable baseline assumed |
| signalTrigger | Named confirmed source fields, scale direction, supported scope, condition and threshold units if numerical | Evidence and qualified acceptance of the actual trigger; not a medical-clearance score |
| permittedFields | Explicit set of sets/reps/load/time/effort/range/support fields and excluded changes | Which changes may be proposed, and which always require manual/professional review |
| changeBounds | Field-specific absolute/relative minimum/maximum, unit and baseline definition | Clinically/technically appropriate bounds; cannot be inferred from training level |
| effortMethod | Named method/scale, direction, confirmed source and interpretation scope | No mixing unlike effort scales or unconfirmed defaults |
| conflictPolicy | Precedence or review outcome for overlapping evidence/rules; source-lineage deduplication | No multiplication/averaging by accident; hard restrictions always preserved |
| roundingPolicy | Available increments and explicit down/up/nearest behavior subject to min/max and unit | Behavior when no permitted increment exists; never exceed bounds |
| comparabilityPolicy | Variant, side, range, equipment, position, method, effort, assistance and quality criteria | Which performances can legitimately be compared; exceptions need exact scope |
| evidenceWindow | Duration/session-count with effective-time and knowledge-cutoff semantics | Window appropriate to reviewed population/task, not calendar alone |
| minimumComparableEvidence | Confirmed comparable observations/completions and required fields | Missing actuals or effort do not count as successful evidence |
| successCriteria | Task-specific target/actual/effort/technique requirements and exclusions | What qualifies for a proposal without implying recovery or clinical clearance |
| progressionBounds | Permitted field changes, units, baseline and maximum/minimum over the defined period | No universal increment or cross-lift percentage |
| difficultyCriteria | Confirmed task-difficulty evidence with symptoms/logistics exclusions | Ordinary coaching versus professional-review boundary |
| regressionBounds | Permitted field changes, units and review point | No symptom-to-percentage rule masquerading as clinical care |
| adjustmentComparisonPolicy | Explicit treatment of original target, temporary adjusted target and measured actual | Whether an adjusted session is comparable and for what purpose |
| reassessmentTriggers | Exact task/finding/side/protocol, source age/event triggers and required authority | Reassessment proposal does not itself resolve the finding |
| weeklyStructure | Coach-selected goals, split, required patterns/needs and allowed days/slots | No autonomous extra days or hidden change in intended programme |
| distributionLimits | Accepted per-session/week constraints, units and counting rules | Avoid double-counting exercises serving multiple needs; unsupported limits stay pending |
| recoveryConstraints | Accepted separation/rest/distribution rules scoped to task/population | No universal recovery duration or diagnosis-specific schedule inferred |

Every adopted parameter needs value, units, scope, basis/evidence, exact revision, named competent reviewer, decision/date and review triggers. Current JSON values are null and admission disabled intentionally. These are genuine external decisions; the authoring task cannot fabricate them. Numerical fixture values are isolated engineering examples, not proposed clinical policy.

## Evidence checked and limits

The [ACSM position-stand index](https://acsm.org/education-resources/pronouncements-scientific-communications/position-stands/) was rechecked during extension preparation and identifies healthy-adult resistance-training guidance. The [WHO guideline publication](https://www.who.int/publications/i/item/9789240015128) was also rechecked for general population context. Neither is treated here as a licence, individual clinical clearance, or validation of this app's wellness trigger, history window or numerical adjustment rule. C12 retains source provenance and earlier retrieval limitations.

Original procedural decisions—source confirmation, preserving history, no stacked effects, explicit coach approval and visible infeasibility—extend the existing product contracts. No new physiological threshold, clinical efficacy claim or condition-specific progression was adopted from these references. Before numerical-policy adoption, reviewers must inspect the relevant evidence for the exact population and rule and document applicability; unreviewed modules remain unavailable.

## Reviewer handback

Use the existing domain review form with P05/P06 requirements, DA/PG rule IDs, parameter names and R2/R3 test IDs. Accept/amend/reject each intended supported scope, supply values with rationale where appropriate, identify exclusions and add missing positive/negative cases. Reviewers may reject automation for a particular decision and retain coach-only review. R1/R2 pilot feedback must be incorporated before final later-release acceptance.

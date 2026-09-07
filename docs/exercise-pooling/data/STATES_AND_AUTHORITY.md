# D04 — lifecycle and authority contract

Version 0.1, 2026-09-05. FP-104/FP-213 draft. Product/domain/security review required. This is a proposed access and workflow model, not a description of current enforcement. REQ-001–005, 010–018.

## Independent states

| Object | Proposed states / rule |
|---|---|
| Assessment collection | draft -> submitted -> superseded/corrected; submitted does not mean professionally reviewed or every item assessed |
| Observation review | pending -> accepted / clarification_required / rejected, with scope; rejected source can still document a report requiring follow-up |
| Restriction | reported/unresolved -> active or explicitly dismissed with evidence; active -> amended/resolved by authorized scope; conflicting/expired instructions -> review_required, not unrestricted |
| Catalogue content | draft -> in_review -> approved -> published -> retired; rejected/quarantined/revoked branches; clinical/rights approval separate from release publication permission |
| Session gate | eligible_for_coach_review / information_required / review_required / held / unsupported / unavailable |
| Exercise eligibility | eligible / eligible_with_conditions / review_required / excluded / unsupported |
| Prescription revision | draft -> ready_for_review -> assigned; superseded/cancelled retained. “Approve & assign” is one guarded atomic action by the coach. |
| Approval validity | valid / stale / revoked; separate from prescription lifecycle and immutable approval evidence |
| Execution | not_started -> in_progress -> completed or stopped; paused/resume requires current checks; never erase completed sets on a hold |
| Persistence | unsaved / saving / saved / failed / outcome_unknown; never equate optimistic UI with assignment |

Session gate returns all reasons, not just one colour. Proposed display precedence is unavailable, held, unsupported, review_required, information_required, eligible_for_coach_review; retain every underlying issue and permitted action. This ordering is an interface convention, not a clinical severity scale. A confirmed urgent-policy event must retain its approved instructions even during other errors.

## Proposed role/action matrix

| Action | Client | Owning coach | External qualified reviewer | Backend/system |
|---|---|---|---|---|
| Submit own reports, health changes and consent action | Yes, authenticated own record | Record on client's behalf only with reporter/evidence attribution | No general client account assumed | Validate identity/purpose/version; record actual event |
| Edit submitted assessment | Submit correction/new report; no history rewrite | New version/correction with reason | Supply scoped correction/review evidence | Preserve superseded source and recompute affected context |
| Resolve ordinary preferences/equipment ambiguity | Supply confirmation | Review/reconcile with client | Not required by default | Re-evaluate affected choices |
| Create/resolve clinical restriction | Report changes; cannot self-clear a hold through API flags | Record/interpret evidence within adopted authority, not exceed professional scope | Supplies actual scoped instructions/approval | Enforce allowed transitions; never invent clearance |
| Author catalogue candidate | No | Yes within authoring scope | Can supply reviewed content/evidence through controlled handoff | Validate, quarantine incomplete/unreviewed records |
| Approve clinical content/policy | No | Only if separately appointed/qualified for that scope | Relevant named reviewer | Store review evidence; cannot self-sign clinical/legal approval |
| Generate/edit workout draft | Propose/request a change; no assignment | Yes within eligible scope | No direct client assignment role assumed | Deterministic candidate computation |
| Approve & assign / reassign | No | Required for each client/date/revision | Not a substitute for coach assignment | Fresh checks + atomic commit; reject tampered authority fields |
| Start/resume assigned session | Yes, permitted version and fresh checks | Yes, recording supervised session on behalf | No routine app account | Verify approval, gate, actor and context; allow logging stop/report even if continuation blocked |
| Log actuals or stop | Own active session; report deviation | Record actuals on behalf | No | Preserve completed data; deviations do not become newly approved prescriptions |
| Read clinical notes / full audit | Own inputs and permitted client-facing information; separate rights request process | Necessary authorized service data | Only explicitly authorized scoped disclosure | Audience-specific projections and minimized diagnostics |

One coach does not remove client-to-client isolation. Existing privileged admin/support routes require inventory and least-privilege decisions; do not grant them clinical authority or delete existing roles under this change. Client-facing minimization does not deny lawful access/correction rights; the routine workout screen is not a full data-export policy.

## Transition contract

| Transition | Preconditions / action | Failure or invalidation |
|---|---|---|
| Source submitted | Valid own-client relation; allowed field set; reporter/date/version captured | Validation failure leaves unsaved report visible, not a saved negative result |
| Draft generated | Authorized coach; approved source policy/catalogue module; context availability known | Held context can be inspected; no assignable fallback draft to bypass it |
| Draft edited/swapped/copied | New revision; each affected item/context checked | Prior approval never travels with a copy; unknown manual exercise needs review |
| Ready for review | Complete required coverage/dose; all item conditions evaluated | Outstanding optional gap may be disclosed; required gap blocks assignment |
| Approve & assign | Coach reviews exact client/date/timezone, content/dose/side, required changes/reasons; fresh server context and catalogue; expected revision matches; all conditions met | Reject stale/conflict/held input; no client-visible new assignment or partial approval |
| Assigned -> stale | Relevant source, restriction, material content, dose, session time/setting or consent-purpose change | Preserve previously assigned snapshot but label non-startable until required recheck/reapproval |
| Start | Assigned revision and approval valid; current authorization and session-specific health-change confirmation; current rule check | No start from a draft/suggestion or failed/unknown save; optional wellness skip alone need not block |
| In-progress change / pause | Always allow stop and saving actuals; new report creates review event | Block continuation when indicated; preserve actuals; replacement remaining work needs coach approval |
| Resume | Current gate and affected remaining-work approval checked again | No automatic resume based only on old `in_progress` status |
| Complete | Preserve actuals and separately record skipped/unperformed work | Completion does not clear restrictions; errors retry idempotently |
| Cancel / supersede | Authorized explicit action, retain audit and relationship | Do not delete historical prescription, consent or performed sets as a side effect |

Required instruction conditions (e.g. assistance, setting or permitted dose) are testable data, not dismissible warning chips. A coach can change a preference with reason but cannot click “ignore” to defeat a restriction. Resolving one hold does not resolve others. Client consent to share a letter is distinct from approval of what that letter permits.

## Clinical-instruction handoff (proposed, no reviewer account required)

Record client and document/evidence ID; author identity, role and verification; authenticity/source channel; issue/effective/review dates; service/module scope; permitted/prohibited movements and sides; dose/range/assistance/supervision conditions where specified; change/referral triggers; which previous instructions it supersedes; and coach interpretation/review actor/time. Do not invent limits omitted from the letter. Ambiguous, contradictory or expired evidence needs clarification by the appropriate authority, not automatic liberalization. Track evidence-sharing permission separately by recipient, scope and expiry.

## Offline proposal requiring A10 approval

Local mode may author and inspect labelled drafts using available data. It cannot claim backend-authoritative approval or account isolation. For the client-app service, propose no new assignment/start/resume while authoritative checks are unavailable. Preserve permitted in-session actuals locally only under an approved secure-storage policy, show unsynced state and provide stop/report action. Define any future supervised offline exception as a separate reviewed policy with bounded validity and reconciliation; none is approved here.

This proposal changes some existing start/manual/copy behaviour. It is not silently activated by this document. See [UX](../ux/WORKFLOWS_AND_COPY.md), [API](../engineering/ENGINE_AND_API_CONTRACT.md) and [tests](../quality/REFERENCE_CASES_AND_TEST_STRATEGY.md).

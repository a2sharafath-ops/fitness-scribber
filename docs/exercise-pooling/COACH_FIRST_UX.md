# Coach-first app experience

Status: implemented locally on `codex/exercise-pooling-local`  
Scope: coach web app presentation and workflow; the existing pooling rules, evidence, approval boundary, audit records, and rollback checkpoints are unchanged.

## Design goal

A coach should be able to use the normal app without understanding pooling, manifests, source tokens, generations, decision records, or recovery journals. The interface presents the next coaching task in plain language and reveals technical records only inside Help and recovery.

## Primary flow

1. **Today** shows the clients and tasks needing attention.
2. **Clients** provides search, simple filters, status, and one clear next action per client.
3. A client **Summary** shows concerns, assessment progress, recent wellness information, and assigned workouts.
4. **Create workout** guides the coach through session details, equipment, movement needs, a current health response, and explicit confirmations.
5. **Review workout** shows the selected exercises and targets in plain language.
6. **Approve and assign** remains a separate, explicit coach action. Preparing or checking a workout never assigns it.
7. The client Summary provides the pre-session health check, start/pause/stop/finish controls, and result recording.

## Navigation

- Main: Today, Clients, Calendar, Workouts, Messages
- Secondary: Reports, Concerns, Settings
- Client: Summary, Details, Assessments, Workouts, Progress

The former standalone pooling test route redirects to Clients. The existing technical workspace remains available only at `/clients/:id/pool/advanced` from the Help and recovery disclosure.

## Safety and recovery preserved

- Client information is reviewed before it becomes current workout authority.
- Adult scope, current health, equipment, and source review require explicit responses.
- Health changes, holds, missing eligibility, stale information, and incomplete coverage cannot silently produce an assignable workout.
- Assignment requires a complete current decision and a separate coach review confirmation.
- Compatible exercise changes run through the same complete-workout checks.
- Unknown saves retain their original operation key and expose one **Check save** action, preventing accidental duplicates.
- Recorded results preserve corrections rather than overwriting history.
- `Fitness Scribber Classic` and the previously recorded rollback checkpoints are not modified by this redesign.

## Verification checklist

- Lint and production build pass.
- Pooling unit, integration, authority, recovery, and coach-view tests pass.
- Ordinary routes render the coach-first pages.
- Explicit review and assignment wording is protected by a UI contract test.
- Advanced engine wording is absent from primary navigation.
- Today, Clients, client Summary, Details, Assessments, Workouts, Calendar, and Reports receive visual/interaction review.
- Responsive navigation keeps named destinations available on small screens.

## Release note

This document describes the local implementation. It does not itself authorize a Git push, Vercel deployment, production data change, or release to real clients.

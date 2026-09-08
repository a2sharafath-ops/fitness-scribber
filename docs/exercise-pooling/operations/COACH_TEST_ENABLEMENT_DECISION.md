# Usable coach-test handoff — exact scope decision

8 September 2026. Status: **A31 approved; implementation and verification in progress, not yet coach-test ready**. This is not another approval of the completed R1–R3 build.

## Why the delivered Preview was disabled

A30.6, A30.9 and the original final-state section expressly required the flags off and run-created identities disabled at completion. Those instructions were followed, but that endpoint did not satisfy the separate request for a usable coach-testing handoff. Disabling the temporary identities was cleanup policy, not proof that the new workflows could not run. The R1/R2/R3 fictional API/browser paths did run before containment.

The substantive blocker is the architecture of test activation: `pooling_runtime` is a single global row. `pooling_enabled()` controls the old athlete read policies and legacy prescription/workout write guard. Merely turning R1 on would change the existing app's shared-backend behavior even though its Production address and JavaScript bundle remain unchanged. Keeping the browser flags off on Production does not isolate these database effects.

Read-only recheck: global R1/R2/R3 false; both fictional manifests revoked; five retired test users remain unavailable. Outside those fixtures there are two coach profiles, one admin and one athlete. No identities, passwords or access settings were modified by this investigation. There are two unused builds within the original ten-Preview-build cap. Free disk space is approximately 3.7 GiB at this recheck, so storage is not presently the reason to stop.

## Recommended bounded change

Create **server-enforced, explicitly enrolled fictional test workspaces**, with global pooling still off for all existing client records. Existing authorized coaches use their current login; no email, invitation, password reset, Vercel bypass or new member is required.

1. Add an exact test-client enrollment/expiry record. Scope runtime checks and legacy guards to the target client rather than activating every client. An enrolled test record must remain recognizable after expiry so expiry cannot turn its past unapproved drafts into Classic prescriptions.
2. Provide an authenticated coach-only test-workspace entry point. It may create only a new conspicuously fictional client owned by the signed-in coach; it may not enroll or relink existing client records, change the coach's role, provide release-operator powers or accept real consent for another person.
3. Provision clearly fictional engineering scenario data through the backend. Keep the 48 actual catalogue candidates unpublished. Do not infer professional acceptance, copy real-client health information or disguise a test acknowledgement as real client consent. The test walkthrough must make any coach-entered/simulated client step explicit.
4. Give that test workspace a seven-day availability window, explicit expiry messaging and a way to stop new test actions without removing drafts/results. Do not unban the retired A30 accounts. No additional auth identity should be created unless required by a genuinely separate client-role check and still within the original six-user total.
5. Use server-returned per-client activation in Preview routing, builder and runner. Existing clients retain Classic behavior; an unavailable runtime check must not silently authorize an action or expose a private projection.
6. Verify the actual existing-login route and end-to-end fictional draft → generation/swap → exact coach approval → permitted execution/result flow, plus R2/R3 review paths. Clearly distinguish a coach-operated test from independent human client-role UAT.
7. Leave the protected test workflow available for the approved window and publish concise instructions. End with only enrolled test clients enabled, not global activation and not an unusable feature-off handoff.

## Why this decision differs from A30

The original permission allowed temporary fictional identities and required revocation/disablement at the end; it also prohibited granting fixture authority to existing users/clients. A persistent coach-facing test entry point under existing accounts and new per-client enrollment semantics changes that boundary. It should be authorized explicitly rather than interpreted as permission to switch on the whole shared database.

This is **not** a request for real exercise publication, clinical/privacy sign-off, coach identity/email, access invitations, paid infrastructure, another Supabase project, a main push or Production promotion.

## Acceptance before reporting ready

- Fresh backup/preservation evidence for the exact additive migration; two-pass rehearsal and ordinary-role negatives.
- Global runtime stays false; existing non-test client read/write behavior remains unchanged. No arbitrary client ID can obtain test activation or scenario data.
- Test and non-test clients are checked side by side; wrong-owner, stale, expired, revoked, forged and repeated requests are denied or replayed correctly.
- Test setup is idempotent and bounded; no old user is unbanned and no existing client/profile is rewritten.
- Actual protected Preview workflow is accessible with the intended existing coach role and produces saved, reviewable results. Do not present a compilation, deployment, disabled screen or checklist as that verification.
- Stop/history/corrections survive the test-window end; no database rewind, deletion or scope upgrade occurs.
- Final handoff includes the actual link, step-by-step test entry, visible expiry, scope/fixture warnings and the remaining real release-acceptance limitations.

## One consolidated decision

Approve the bounded per-test-client migration and seven-day fictional coach-testing handoff described above, using existing coach access, global flags off for existing records, the same projects and remaining A30 resource/cost caps. Keep main/Production/Classic, original records, Preview protection and real-content/release gates unchanged.

The owner approved this bounded scope through the delegated follow-up (“Okay, yeah, approve. Go for it.”) and asked to resume after the app interruption. No repeat scope approval is required. Approval is not evidence of completed recovery, activation or a usable handoff. Global activation remains excluded.

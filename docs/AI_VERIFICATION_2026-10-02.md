# AI verification, 2026-10-02

## Consolidated regression after browser fixes

Ran the same 151 AI/settings/note/source/writing/request lifecycle unit files
against the current code after recent navigation, refresh mount, task labels and
retry changes: 1059/1059 passed, no skips or failures. This supersedes the earlier
1055 count for current code. It is one run, not a cumulative total. Previous
20/20 real HTTP integration evidence and the recent browser/disk-readback proof
remain scoped to their recorded fixtures; unit green does not certify inference.

Read-only current model inventory still lists only qwen2.5:7b, qwen3:8b and
qwen3.5:9b. No changed model resource justifies repeating the previous failed
writing diagnosis comparisons. The user has explicitly deferred the API address;
do not prompt again for it or fabricate a provider configuration.

### Current overall gate

Settings connection/draft preservation, consent, cancellation, stale-result
handling, review feedback and source adoption have recorded automated and bounded
browser evidence. Writing diagnostic quality is still NOT accepted: incorrect
kinds, missed findings, false positives, unsupported rationale/action and CPU
latency were observed in full-request comparisons. Grounding validation must not
be relaxed and AI must not silently replace the user's text to mask those issues.

At this closeout boundary no evidence-backed implementation remedy for those
semantic failures is established. Real-provider/model comparison remains the
dependency for the next quality decision. This is the first fresh impasse audit
after the independent browser fixes, not a completion claim or a blocked status
change. Leave the goal active. No new inference, service, paid call, commit,
push or package this turn; do not keep expanding UI work merely to avoid this gate.

## Note AI failure retry entry

Previous turn made browser-verified progress on live suggestion feedback.
Current rendering inspection found that state.error replaced the entire note AI
region with error text only, leaving no retry command. Added a retry button in
that existing error region using the existing data-note-ai-analysis event route;
no new controller, panel or background retry. Loading state still takes priority
so repeated clicks cannot start a second run while preparation is pending.

Rendering coverage checks the retry route and HTML escaping of error text.
Related note UI, action and analysis lifecycle suites passed 28/28, including
failure unlocking, duplicate suppression and stale-result checks. This is unit
and routing evidence, not a fresh browser failure-injection claim. No running
service, model call, paid request, note mutation, commit, push or package.
Writing diagnostic quality and deferred live remote comparison remain open.

## Note AI review live-feedback browser fix

Using existing suggestions in the isolated browser vault (no new inference),
found two actual UI issues. Suggestions exposed permanent_note_distillation as
their scope; it now reads 观点整理, and unknown schema fields/scopes use generic
Chinese labels rather than implementation IDs. A new regression covers both.

More importantly, clicking Ignore persisted status=rejected in the actual API
but left the rendered card at suggested. Read-only API inspection established
that the write succeeded; this was not a transport failure. Existing refresh
logic searched for data-note-embedded-ai-workspace, while the distillation view's
existing wrapper had no such marker. Added the marker and note ID to that same
wrapper, with no extra panel or duplicate DOM structure.

Browser replay after reload used the second still-pending suggestion. Clicking
Ignore now immediately showed 已拒绝 and 这条建议已忽略, removed its action
buttons and retained the open optional details/form. Note Markdown SHA256 before
and after both Ignore actions was identical:
71863399FE815799E54A379E86F2C4452AA04F258A6A084B4E1C63732B7C6446.
Screenshot: test-results/ai-browser-20261002/note-ai-review-live-feedback.jpg.
This proves the real review write + visible refresh path; it does not claim
confirmation/adoption or async fault injection was also browser-tested.

Related rendering/action tests 11/11 passed; diff check passed with the existing
CRLF warning. Browser tab closed, viewport reset and dev session 70787 plus all
three children exited. No new local inference, remote request, formal-user note
mutation, commit, push or package. Overall goal remains active.

## Source adoption directory cancel and retry browser proof

Continued the remaining browser gate using the isolated test vault, web 5295/API
3095 and existing local qwen2.5:7b. One real source-distill request produced an
editable draft. No remote provider or paid call used. The draft's interpretation
was not treated as authoritative; manually reviewed/edited title, thesis and
body in the visible AI result before adoption.

Clicked Create Permanent Note, then cancelled its directory picker. Visible
feedback explicitly said no note was created and draft was retained; all three
edited field values survived. Actual Markdown inventory remained at five files.
Clicked Create again and confirmed the target directory. App opened the new
permanent note and displayed the edited text and source backlink. Inventory rose
to six files, with exactly one new file named 采纳目录取消验收.md. Filesystem
readback confirmed pn_4998b14e, draft status, authorship.ai_assisted=true,
user_confirmed=false and the stable source link fn_3c5072e7. No automatic human
authorship confirmation was inferred from adopting an AI-assisted draft.

Screenshot: test-results/ai-browser-20261002/source-adoption-directory-retry.jpg.
This proves ordinary cancel/retry persistence in the rendered app. Concurrent
result closure/replacement during picker selection remains covered by behavioral
unit tests, not claimed as browser fault injection. No production-code change
needed this turn. Test tab closed, viewport reset and dev session 12032 stopped;
existing Ollama retained. No commit, push or package. Writing semantic-quality
acceptance and deferred real remote comparison remain incomplete.

## Pending task navigation race verified

Previous turn made verified progress by fixing and browser-replaying Settings
return navigation. Review of its newly awaited note-open boundary found that
a replacement pending task or vault switch could occur before the old resume
continued. Two regressions reproduced the old source action running afterwards.

Resume now captures vault scope and rechecks pending-task identity and vault
switch state immediately after note opening. It never clears a replacement task;
an obsolete task belonging to the switched vault is discarded. Focused source,
settings, writing, note-suggestion and note-analysis suites passed 120/120.
This race is verified at the async method boundary, not claimed as a new browser
fault-injection test. No service started, real model call, paid request, formal
note mutation, commit, push or package in this turn. Writing semantic quality
remains incomplete; overall goal active.

## User-authorized direct browser verification

User asked the agent to start the environment directly. Launched dev-all in a
foreground tool session with VAULT_PATH set to test-results/ai-browser-20261002/
vault, API 3095, web 5295. No formal user vault used. Real local qwen2.5:7b
connection tests returned actual replies through the rendered settings dialog.

Browser discovered an actual navigation defect: successful local setup resumed
source distillation while the UI stayed in Settings. The active editor tab had
not changed, so editor resume skipped note reopening. A new behavior regression
reproduced this. Editor resume now awaits reopening when necessary; the app
orchestrator explicitly activates explorer before resuming the pending note task.
Reopening alone did not change the module, so that first repair was insufficient;
the explicit navigation wiring is required and was added after browser retest.

Final browser replay: open source, select an untested model, invoke source AI,
return to the saved local model, test it. Actual successful reply automatically
returned to the original source workspace, where AI progress was visible. The
subsequent model response failed source grounding and was correctly rejected:
visible warning says its evidence is absent from the source, no adoption and
retry available. This proves navigation and rejection feedback, not semantic
quality acceptance or the full asynchronous directory-selection acceptance gate.
Screenshot: test-results/ai-browser-20261002/settings-resume-source-guard.jpg.

Source/editor, settings bindings and writing runtime suites: 96/96 passed. Browser
test tab closed, viewport reset, dev session 91649 stopped with Ctrl-C; child API,
web and worker reported exit. Existing Ollama was retained. No paid request,
commit, push or package. Goal still active with writing-quality gates incomplete.

## Cross-module closeout audit

The preceding goal turn was verified progress on field-suggestion review safety.
This turn revalidated the wider current implementation rather than extending
another isolated flow. Selected 151 related unit files by AI/settings/note/source/
writing/request-abort names; 1055 tests passed with no failures or skips.
Counts are this single run, not totals accumulated from earlier runs.

Real-HTTP integration: api-ai-remote-settings.test.mjs and api-writing.test.mjs,
20/20 passed in 24.3 seconds. These cover synthetic HTTPS provider credentials,
explicit save/restart/delete, request-local test keys, cancellation of writing,
source, note-analysis and test-chat transport, no cancellation persistence, retry,
review-only remote artifacts, concurrent vault switching and guarded note saves.
They do not prove a real paid provider's model quality. Temporary vaults only.
After completion, process inspection found no API/web dev-server processes;
known ports 3000/3095/5173/5190/5295 were not listening. Existing Ollama remains
on 11434, PID 26280. No owned test session remains live.

### Remaining acceptance gates

| Gate | Required proof | Current state |
| --- | --- | --- |
| Recent source adoption and field-review fixes in the rendered app | Directory selection, close/re-run, failed retry and vault-switch browser operations; no stale writes or status | Unit/API boundaries verified; fresh browser proof missing |
| Writing diagnosis accuracy | Full production request on faulty and clean outlines; correct kind/location, grounded explanation, no invented evidence or action, acceptable latency | Existing installed local models failed portions of this gate; not accepted |
| Real remote comparison | User-supplied endpoint/model configured in settings; bounded synthetic-content comparison | Deferred by user; no endpoint supplied, no paid call made |

Do not rerun the same model experiments without changed resources, weaken the
grounding gates to get green results, or call the overall goal complete on unit
counts alone. Next useful step is fresh browser verification of the recent fixes
once a dev server is available, followed by the deferred real-provider comparison.
This audit made no production code changes, commit, push or package.

## Note AI suggestion review ownership verified

The preceding goal turn made verified progress on source adoption. Continued
inspection found actual note-field suggestion review races. Three regressions
reproduced a PATCH after vault switching during detail lookup, duplicate GET/PATCH
pairs on repeated confirmation, and a late failure replacing a newer AI panel.

Field suggestion actions now reject duplicate clicks while pending, capture the
owning workspace state/vault, and revalidate before persistence and after each
asynchronous adoption/readback stage. Old success/failure cannot update a new
workspace state. Suggestion refresh checks the vault scope and active note as
well as its request serial, including the same note ID in a different vault.
Success status after refresh also checks ownership of the refresh revision.

Five new behavior tests use actual prototype-api request paths with mocked fetch:
cross-vault confirmation, duplicate confirmation, late failure, retry after a
failure, and stale cross-vault refresh. The source-code UI placement assertion
was adjusted for the explicit refresh promise/serial guard, not weakened away.
Related note AI, embedded workspace and source-editor suites passed 70/70.
Expanded validation including writing runtime, contextual actions and source
request cancellation passed 117/117; git diff --check passed (existing CRLF warning).
No new browser, model or remote-provider verification; no real note mutation,
commit, push or package. Remote API setup remains deferred by the user.

## AI adoption ownership verified

Remote configuration remains deferred per the user's instruction. Three new
regressions first reproduced stale AI draft adoption: closing the result during
directory selection still saved it, replacing it with a new run still saved it,
and completion of an in-flight creation marked a newer result as adopted.

Source adoption now captures its owning AI state and vault scope. The existing
directory-selection helper checks that ownership before dispatching persistence.
Late success or failure does not update a replacement AI state. Persistence that
has already started is not falsely reported as cancelled; its actual creation
result is returned without marking a newer AI result as adopted. A fourth
regression covers failed adoption unlocking and retrying the retained edited draft.

Focused source adoption, source AI and note analysis suites passed 91/91. No new
browser verification, real model call, remote request or real-note mutation. No
commit, push or package. Remote semantic-quality verification remains pending;
the active goal is not claimed complete.

## Source adoption persistence guard verified

Continuing non-remote AI work per the user's direction. Source promotion marker
persistence previously called updateNote without expectedBody/expectedRevision,
and a successful response updated savedBody but left savedFileRevision stale.
New regressions reproduced both missing protection and stale revision behavior.

The source promotion controller now supplies the persisted tab baseline (or
loaded source body fallback) and known whole-file revision. It does not use the
unsaved draft as the expected baseline. Empty known revision strings are passed
through for existing backend validation, not silently omitted. Successful source
readback updates the tab's savedFileRevision. Existing failure behavior retains
the created permanent note, local source marker/draft and original saved baseline.

Five new regressions cover baseline selection, revision refresh, empty revision,
conflict preservation and a real temporary vault. The real-vault test creates a
permanent note, changes the source concurrently using the domain persistence
layer, then runs guarded source-marker persistence. The source file remains
byte-for-byte equal to the external change, permanent note remains readable,
and editor source draft stays dirty with a warning. This is actual filesystem
evidence, not only a mocked conflict callback. Temp vault cleanup is bounded to
the generated directory under the OS temp root.

Source workflow, guarded-save and readback suites passed 87/87; diff check passed
with only the existing CRLF warning. All test sessions terminal. No new browser
verification, real model call, paid request or real-note mutation. No commit,
push or package. Goal active; remote model-quality comparison remains deferred.

## User deferred remote setup; other AI flow work resumed

User will provide the API address later and explicitly requested verification
and optimization of the other features first. Remote quality comparison is
deferred, not a reason to stop all other work. Goal is active and unfinished.

Found a pre-request dirty-note save race in runPermanentNoteAnalysis: request
ownership/loading started only after saving, so duplicate clicks invoked save
twice and closing recommendations during saving could still start AI afterwards.
Regression cases reproduced duplicate saves and provider preparation after an
edit before the fix. Moved dirty-note saving into prepareNoteAnalysisRequest,
after the existing request/loading lifecycle begins; the large editor entry now
only orchestrates this preparation.

Save completion now checks request ownership, abort state, active note and the
actual dirty state before preparing AI. A still-dirty tab or explicit failed
save stops analysis and displays a concise warning. Void successful saves and
normalization are supported by capturing the persisted post-save body. Save
exceptions show existing actionable failure UI and release the request for
retry. Cancelling analysis does not undo or abort the user's note save.

Seven new regressions cover duplicate save/cancel, editing during save, failed
save retry, thrown save error, successful normalization, void failed-save result,
and old-save completion while a new request is pending. Relevant relation,
embedded note AI, error and source-distillation suites passed 69/69; diff check
passed (existing CRLF warning only). Initial hung reproduction runner was stopped
by verified process IDs and its exec session reaped; no owned test process is
live. Current change has unit-level verification, not new browser proof.

No real-model or paid request, real-note mutation, commit, push or package.
Remote model-quality acceptance remains deferred and incomplete. Continue with
other source adoption/review and settings interaction verification.

## Remote configuration dependency: goal blocked

Third consecutive goal turn with the same missing usable remote configuration,
counting the authorization turn and setup-launch turn. Current read-only SQLite
inspection confirms no remote provider in the default vault and only the disabled
loopback synthetic fixture in the acceptance vault. No API/web listener exists
on ports 3000/3095/5173/5295. The policy-rejected launch was not bypassed.

User authorization for up to two synthetic remote comparisons remains valid,
but a real endpoint, model and configured credential are still unavailable.
No meaningful quality verification can proceed without user configuration or an
external resource change. Mark goal blocked, not complete. Resume when the user
provides service/model and the configured vault location; do not ask for API Key
in chat. No paid request, real-note mutation, commit, push or package occurred.

## Remote setup UI launch not available

Tried to start API 3095 and web 5295 against the existing isolated acceptance
vault so the user could enter provider credentials without sharing them in chat.
The exec tool rejected the hidden background Start-Process command by policy
before execution. Neither service started; do not bypass that restriction using
another launch mechanism. No remote request or credential mutation occurred.
Remote comparison is authorized, but usable provider configuration is still
missing. User can configure the existing app and provide service/model/vault
location, or manually start the isolated local development environment.

## Remote comparison authorized; provider configuration needed

User replied "1" to the explicit choice allowing remote-model comparison with
possible third-party API cost. This supersedes earlier statements that remote
use is unapproved. Authorization covers synthetic acceptance material only;
no real notes or credential disclosure. Plan the initial comparison as at most
two requests (unclear finding and clean-flow false-positive control).

Read-only inspection of ai_provider_configs in the default example vault and
the isolated AI acceptance vault found no usable real remote service. The default
vault has only Ollama. The isolated vault's remote entry is disabled, points to
the former loopback HTTPS fixture and has no saved key. Only Ollama is currently
listening on the inspected dev/API ports. No remote request was made.

Requested actual service/base URL and model name. API Key must be entered in
the application's AI settings rather than posted in chat. Existing historical
blocked status is not a current lack-of-authorization claim: the new dependency
is missing usable provider configuration. Goal remains unfinished.

## Third impasse audit: goal blocked on model resource

Third consecutive strict audit confirms the same dependency: /api/tags still
lists only the three tested models and no remote-use authorization or new runtime
resource has arrived. Local quality failures and thinking-mode timeouts remain;
no inference session is live. Existing verified code fixes are preserved, but
full semantic writing diagnosis has not achieved acceptance. There is no
evidence-backed safe change that resolves this gate with the currently available
resources. Mark the goal blocked, not complete, and stop automatic repeated
checks. Resume requires user authorization/configuration for a stronger model
comparison or an explicitly selected new local model/runtime resource.

## Model-resource dependency: second impasse audit

Re-read the authoritative Ollama /api/tags inventory: still only qwen2.5:7b,
qwen3:8b and qwen3.5:9b. No new model/resource or remote-use authorization has
arrived. Existing experiments are terminal; no live process to wait on. No safe,
evidence-backed production change was identified that resolves the remaining
semantic-quality gate without another capable model resource. Do not mistake
this status audit for feature progress. Same dependency persists for a second
consecutive goal turn after the strict first audit; keep active until the blocked
threshold or new user input. No repeated inference, paid call or code change.

## Context-headroom retest and model-resource dependency

Revalidated the thinking-mode latency finding with --output-tokens=2000 rather
than 4000. Installed qwen3.5:9b, unclear fixture, normal thinking, full unchanged
production prompt: timed out at 120,119 ms, no usable output. This smaller budget
fits the observed 4096 context with the fixture input; the previous excessive
output-headroom concern does not explain away this timeout. Session terminal
exit 1. No timeout extension or production model/behavior change.

Authoritative /api/tags inventory contains only qwen2.5:7b, qwen3:8b and
qwen3.5:9b. Their tested modes have not passed the full diagnostic quality gate.
No other installed model is available for a meaningful stronger-model comparison.
Remote use remains unapproved; no real-note or paid-provider request made.

After this last independent local boundary check, the remaining quality work
requires a user-selected/authorized stronger model resource or external runtime
change. This is the first strict impasse audit after exhausting this specific
budget-confound check; do not retrospectively count earlier turns that still had
safe independent experiments as no-action blocked turns. Overall goal remains
active, not complete or blocked yet. Repeated blind prompt tuning is not a
verified path to the requested reliable end state.

## Thinking-mode limit and remaining installed-model comparison

- qwen3.5:9b normal thinking, unclear fixture, smoke output budget 4000:
  timed out at 120,025 ms without usable output. Runtime /api/ps confirmed
  context_length 4096 and size_vram 0. This is a latency/resource observation,
  not evidence of semantic improvement; 4000 output tokens also exceeds the
  context headroom after this fixture's input. Production defaults unchanged.
- qwen3.5:9b --no-thinking, revised clean evidence control: 37,853 ms, false
  evidence-gap finding at sections 1/2. It demanded baseline/trial collection
  steps already explicitly present in section 3. The wording ambiguity of the
  previous control is removed; this run proves a false positive. Gate failed.
- qwen2.5:7b standard execution, unclear fixture: 49,940 ms, checks:[], missed
  the undefined people, timing, object and completion criterion. Gate failed.
- qwen3:8b --no-thinking, same unclear fixture: 53,445 ms, checks:[], same
  missed issue. Gate failed.

No installed model/mode tested here established reliable full-scope diagnosis.
Do not integrate classifiers, switch defaults, relax validation, or claim the
goal complete on the basis of earlier passing individual cases. Further blind
prompt tuning is not supported by these results. A stronger-model quality
comparison requires an available model/runtime or authorized configured remote
service; the remote authorization question remains unanswered. No paid calls.

All four owned sessions are terminal. Existing Ollama is retained. Settings,
cancellation, credential and evidence-validation fixes remain separate from
the unsolved semantic-quality gate. No real-note mutation, commit/push/package.

## Evidence-gap and transition real-model results

All runs used installed qwen3.5:9b, full unchanged production request,
smoke-only --no-thinking, 700 output tokens, synthetic quality-workflow inputs.

- Faulty evidence gap: 30,448 ms, correctly returned only section 3 evidence_gap
  for the unsupported universal 80% reduction claim. No invented statistics;
  gate passed, exit 0.
- Faulty transition: 35,974 ms, detected the invalid leap from this check to all
  future projects but mislabeled it contradiction and omitted evidenceQuote.
  Production validation rejected it; exit 1. The gate was not weakened.
- Initial clean evidence control: 44,346 ms, reported an evidence gap at all
  three sections. Review found the wording "use prior records" could imply an
  available baseline even though the source says there are no statistics. Do
  not use this ambiguous control as decisive false-positive evidence. Revised
  the control to explicitly collect both baseline and trial data before any
  calculation; added a regression. Real retest remains pending.
- Clean transition control: 52,764 ms, falsely reported repetition of sections
  1/2 (define acceptance criteria versus execute checks). Its conditional reason
  hypothesized that section 2 lacks a checking action despite that action being
  explicit in its purpose. Exact quotes and IDs were valid, but semantic quality
  failed; structural validation cannot prove the diagnosis is true. Exit 1.

Current fixture/production validation regressions passed 10/10. No prompt,
schema, model default or production executor change. All four owned sessions
are terminal; no paid service, real notes, commit/push/package used.

Asked for optional authorization to compare a configured remote model using
synthetic material only, with possible third-party API cost. Until an answer,
no paid-provider request is authorized. Safe next local action is a normal
thinking-mode diagnostic comparison, not more tuning of the same no-thinking
prompt. Overall goal remains active and semantic diagnosis is not accepted.

## Structural diagnostic fixtures and unclear-expression failure

Added script-local --structure=transition|evidence_gap|unclear fixtures and clean
counterparts. They run the full production request, not the isolated classifier.
The transition gate accepts transition or evidence_gap for a single-instance to
all-future-projects leap, since either diagnosis can be justified; the other
gates require their named kind. All faulty gates require exactly one finding at
section 3; clean gates require checks:[]. Expected labels are not model inputs.

Real qwen3.5:9b, smoke-only --no-thinking, unclear-expression fixture:

- Initial source also included an unrelated zero-defect result. At 40,379 ms the
  model reported contradiction instead of unclear. Removed that confound from
  unclear/evidence-gap sources, retaining it only in the transition fixture.
- Retest: 34,255 ms, still falsely called vague people/timing/objects a
  contradiction against the responsibility requirement. Gate failed.
- Tested one instruction explicitly separating opposing claims from missing
  details. At 40,321 ms model still called it contradiction, switched to English,
  and omitted the necessary quote. Production validation rejected the output.
  Reverted the instruction and its temporary unit test; no failed prompt retained.

Fixture and production validation regressions passed 9/9 before that temporary
prompt edit. Evidence-gap, transition and clean structural real-model runs remain
pending. All owned inference sessions are terminal. No default model change,
paid service, real note mutation, commit, push or package. Overall goal is active.

## Current acceptance status

This summary supersedes older provisional status statements below, not their
historical evidence. Overall AI goal is active; writing diagnostic quality is
not accepted. No experimental classifier has been integrated into production.

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Local runtime discovery and usable connection test | Repaired Ollama; real local replies; browser test cancellation/retry | Verified for tested Windows host |
| Settings drafts survive delayed reads | Deferred-response regressions and delayed-read browser evidence | Verified for tested paths |
| API Key replacement and explicit remote Save | Single input owner; browser replacement; synthetic HTTPS integration persistence/deletion | Verified with synthetic credentials |
| Explicit remote consent and stale-result protection | Consent bound to provider/model/config; settings tests and browser checks | Verified for tested paths |
| Source-note AI draft, cancellation, review/adoption and disk readback | Real local-model browser adoption, retry and persisted result | Verified for tested fixture |
| Note/relation request cancellation and stale-response handling | Request-scope tests, real HTTP cancellation and browser close/retry | Verified for tested paths |
| Writing diagnosis with accurate conflicts/repetition and full diagnostic scope | Multiple real local-model fixtures fail; isolated classifier remains experimental | Not accepted |
| Live paid-provider quality and performance | No authorized live third-party quality comparison performed | Not verified; synthetic protocol tests do not prove it |

Latest settings regression run: 57/57 across settings bindings, controls,
renderer, refresh guard and remote consent. These counts overlap earlier runs;
they are not a cumulative unique test total. Historical entries below retain
precise limitations and evidence paths. Do not generalize Windows/browser fixture
proof to every operating system, provider or arbitrary note collection.

Scope: existing AI runtime detection, settings routing, connection checks,
review-first behavior, and local inference. No new AI features or default
provider/model changes. Formal user notes were not used for inference.

## Fixes

- Convert synchronous executable launch failures into failed command probes.
  A damaged Ollama executable previously caused local runtime API tests to
  fail with HTTP 502 / `spawn UNKNOWN` before the HTTP model probe could run.
- Ignore stale route previews after another request or configuration change.
- Ignore connection-check results after the tested configuration changes.
  An old successful check must not certify a newly edited endpoint/model/key.

## Environment repair

The user authorized reinstalling Ollama while preserving existing models.
The official winget package installed Ollama 0.35.0 successfully. The local
HTTP runtime responds on port 11434. Existing models remain available:
`qwen3:8b`, `qwen2.5:7b`, and `qwen3.5:9b`.

## Automated verification

- `node scripts/review-first-core-check.mjs`: 177/177 passed.
- Runtime controller/actions/event bindings and quiet command probe tests:
  40/40 passed. This overlaps the wider verification scope; counts are not
  presented as a unique combined total.
- `node scripts/smoke-local-ollama.mjs`: real `qwen3:8b` model call succeeded
  through the application harness's hybrid local route. The single-note
  smoke fixture produced no relation artifacts; this is a connectivity check,
  not evidence of relation candidate quality.
- `git diff --check`: passed.

## Real local model evaluation

Synthetic English fixtures, temperature 0, 120-second request timeout.
The existing acceptance threshold is at least 3 of 4 cases.

| Case | qwen3:8b | qwen2.5:7b |
| --- | --- | --- |
| Summary JSON | Passed, 41.6 s | Passed, 35.2 s |
| Tag JSON | Timed out, 120 s | Passed, 6.0 s |
| Relation candidate | Passed, 69.6 s | Failed expected related-pair decision, 10.4 s |
| Structured decision | Passed, 95.7 s | Passed, 8.9 s |

Both reached 3/4, but neither passed all cases. The machine used CPU inference.
Do not treat the threshold result as evidence that all model outputs are
correct or that latency is release-ready. No default model was changed.

## Limits and next acceptance checks

- Remote OpenAI-compatible flows were covered by automated local test servers,
  not by a live paid third-party provider. No user credentials were disclosed.
- Browser acceptance was added in the follow-up below.
- Chinese note quality, long-document generation, and hardware acceleration
  were not evaluated by these synthetic fixtures.
- Next manual acceptance: select a local model in settings, detect models,
  test the current configuration, generate a candidate from a test permanent
  note, and confirm that no note or relation changes before explicit adoption.
- Treat CPU timeout and relation omissions as model/hardware acceptance risks;
  do not weaken evaluation assertions simply to obtain a passing result.

Changes remain uncommitted. Existing unrelated workspace changes were kept.

## Browser follow-up

Isolated API port 3095, web port 5295, vault under
`test-results/ai-browser-20261002/vault`. No formal vault was modified.

Three additional defects were reproduced and fixed:

1. The note AI action required a local model but omitted `executeLocalModel`,
   so it only produced rule candidates. It now explicitly executes the model
   and disables silent fallback on provider failure. Malformed model JSON is
   reported as rule-only fallback with warning feedback, not normal AI success.
2. A successful connection test remained busy while awaiting a resumed note
   analysis. Test completion is now rendered before resuming work, and a
   resume failure no longer changes the successful test into a failed test.
3. Startup bootstrap preview replaced the user's installed model selection
   with the recommended default. Read-only preview now preserves the selection;
   explicit bootstrap activation can still switch the model.

Observed in the browser:

- All three installed models appeared in settings.
- A real `qwen2.5:7b` test returned the requested Chinese success reply.
- Note analysis produced the model's relation rationale, rather than the
  fixed local-rule rationale.
- Before confirmation: external relations 0, body links 0; original body intact.
- After explicit confirmation: external relations 1, body links 0; body intact.
- After refresh: `qwen2.5:7b` remained selected and settings showed AI available.

The revised test-completion/resume ordering is additionally covered by a
focused regression asserting completion before resumption and preserving test
success when the resumed action throws. Latest targeted run: 62/62 passed.

Evidence files:

- `test-results/ai-browser-20261002/local-ai-test-success.png`
- `test-results/ai-browser-20261002/model-candidate-before-confirm.png`
- `test-results/ai-browser-20261002/model-relation-confirmed.png`
- `test-results/ai-browser-20261002/model-selection-after-refresh.png`

Live paid remote-provider acceptance remains outstanding. CPU latency and
model-quality limits from the earlier evaluation remain unchanged.

## Active polishing goal

Objective: complete AI settings and improve the usability of core AI features.
The goal remains active; the checks above do not prove the whole objective.

Latest follow-up fixed stale chat-test completion. The reply now belongs to
the exact provider/configuration/model/key used when the request started.
Changing those fields invalidates the old reply, and an older failed request
cannot replace a newer success or clear its busy state. Configuration identity
is compared only in memory; credentials are not logged or written to this report.

Four regression tests reproduced the defect before the fix. Latest targeted
run: 66/66 passed, including endpoint change, key change, local-model change,
and late failure after a newer successful reply.

Remaining completion gates:

- Remote settings: configure, test, save, reload, remove key, and recover from
  invalid credentials/endpoint/model, with truthful state and no secret output.
- Core local AI: note/relation analysis and source-to-viewpoint workflows must
  execute the intended model, keep review-first boundaries, and recover from
  invalid output and request failure.
- AI writing: verify outline/draft generation, explicit adoption, persistence,
  and preservation of user edits when generation fails or finishes late.
- Long-running operations: verify bounded waits, visible progress, cancellation
  where offered, and retry without duplicate writes.
- Usability: one clear primary setup action, no false success state, no confusing
  fallback attribution, and concise actionable errors across these workflows.
- Final focused review and regression/browser acceptance for the actual scope.

Remote protocol tests can use a synthetic local OpenAI-compatible provider;
live vendor acceptance requires a user-configured provider and API key. These
are different evidence levels and must be reported separately.

## Provider deadline follow-up

Found that analysis settings supplied `timeoutMs`, but the compatible adapter
discarded it and the network executor had no deadline. A slow or stalled
provider could therefore leave a core AI operation waiting indefinitely.

The adapter now carries the deadline in internal request metadata, not in the
vendor's JSON body. The executor bounds both response headers and full body
reading, aborts the transport on timeout, and clears the timer on completion.
The default is 120 seconds; a valid per-task setting overrides it, capped at
10 minutes. Existing analysis task deadlines are honored rather than silently
ignored. Timeout is classified as HTTP 408 / `timeout` for retry handling.

Evidence: three failing reproductions before the fix; after the fix, the
deadline, analysis executor, orchestrator harness, and provider guard suites
passed 78/78. Coverage includes real local HTTP servers stalling before headers
and midway through the JSON body, plus a transport that ignores abort.

Remaining performance gate: the permanent-note task's existing 60-second
deadline may be too short for this CPU-only machine. Re-evaluate its bounded
prompt/output size and the supported local-model choices before claiming the
core local AI experience is polished. Do not remove the deadline to hide this.

## Model context follow-up

Two regressions exposed unnecessary full rule diagnostics and loss of evidence
after the first sentence. Model excerpts now retain bounded continuous body
content (1200 characters for the source, 320 for related/source material),
instead of truncating at the first sentence. The prompt carries a compact
baseline rather than full diagnostic objects, uses compact JSON, and asks for
at most three relations, two topics and three warnings, with a short draft.
The response contract and human-review boundary remain intact.

Verification: note-analysis/executor tests 25/25, core regression 177/177.
`scripts/smoke-local-note-analysis.mjs` uses two synthetic English notes and
does not read or write a vault. Its real `qwen2.5:7b` run ended at 60042 ms with
the expected timeout classification. Core tests were also running during that
sample, so this is not an uncontended performance benchmark and does not prove
a latency improvement. Full structured analysis is still not accepted as a
smooth CPU workflow.

Next performance work: give an explicit relation recommendation action a
relation-only model task instead of also generating a viewpoint, draft, topics
and general warnings. Retain the complete analysis for its own explicit action.
Verify both task contracts and real execution before closing this gate.

## Relation-only recommendation

The relation entry now forwards `analysisFocus: relations` through the editor,
including resume after AI setup, to the API and model request. Full analysis
remains the default for its own action. Relation-only requests omit drafts,
topics and rule baselines, and use a 400-token generation budget. Results only
accept actual candidate note IDs; empty model results are authoritative.
Only relation artifacts are offered for human review, never automatic writes.
Malformed JSON or a missing relation array is explicitly flagged.

A real qwen2.5:7b run on two synthetic notes succeeded in 43731 ms with a
1470-character prompt and no viewpoint output. It returned three relation
types for the same pair, including an unconvincing contrast. Subsequent guards
retain one highest-confidence suggestion per target and ask the model not to
confuse differing perspectives with opposing claims. These last guards have
unit coverage; a second real run and current browser acceptance remain pending.
The 44-second sample is not a smooth-interaction acceptance result. No vault
data was read or written by the smoke script. No commit or push performed.

## Accurate waiting and failure feedback

The editor's 18-second reminder now says analysis is still running rather than
claiming no relation was found. Editor callers request propagation of original
API errors; other callers keep the previous false-result contract. The failed
recommendation displays the original cause instead of a no-match notice, and
can be retried. A malformed-model warning survives the editor's final refresh
instead of being overwritten by a success status. Empty valid results still
show the ordinary no-match state. Results from a note that is no longer active
do not repaint the empty-result state on a newly selected note.

Behavior tests exercise an unresolved request plus the delayed reminder,
failure followed by retry, and malformed output through the real editor method.
These three tests pass, with the graph action propagation and embedded-workspace
tests also passing (18/18). Browser acceptance of the current changes is still
pending; this does not close the wider AI usability goal.

## Browser-discovered hidden status copy

Actual browser acceptance found `.permanent-relation-empty p` hidden by CSS,
so the UI concealed wait notices and error causes despite correct text in the
view renderer. Removed that hiding selector, added a retry action on failure,
and retained the loading heading when the delayed reminder is present.
Workspace/feedback regressions pass 29/29. Actual browser screenshots
`test-results/ai-browser-20261002/relation-wait-visible.png` and
`relation-failure-visible.png` prove visible delayed waiting and timeout details
with a retry button. The Chinese note request still timed out; its English
error needs user-facing localization. No post-fix successful Chinese model run
or browser retry-to-success is claimed. The prior saved relation stayed visible
and was not automatically changed. Temporary browser tab was closed.

## Error localization and true retry

Analysis executor failures now expose only a public provider error category in
API details (not the raw provider response). A small web helper translates
timeout, authentication, missing-model, rate-limit and unavailable-service
categories into actionable Chinese copy, retaining unknown specific messages.
Explicit relation retry now starts a new request even if old candidates are
cached. Repeated clicks while the active note's analysis is loading are ignored.
The five focused files pass 34/34, including error propagation, Chinese editor
feedback, cached-candidate retry and duplicate-click behavior.

The smoke script now has a synthetic Chinese fixture selected with
`AI_FIXTURE_LANGUAGE=zh`. A qwen2.5:7b relation-only run succeeded in 17411ms,
1297 prompt characters, yielding one human-review-only `extends` suggestion.
This does not prove the browser timeout resolved: inspect actual browser model
routing and payload before claiming performance acceptance. Runtime `/api/ps`
reported CPU-only execution (`size_vram: 0`). No model defaults were changed.
No real-vault access, commit, push or package in this slice.

## Actual API route verification

Read-only inspection of the disposable vault's AI database confirms all six
Ollama runtime model mappings and saved local model/modelRef point to
qwen2.5:7b. A direct POST to the real note-analysis endpoint using the same two
Chinese notes and relation-only options completed in 39479ms. Its modelExecution
reports succeeded, fallbackUsed false, modelRef ollama_local_gateway:qwen2.5:7b,
local_only privacy and cloudAllowed false. Provider usage: 538 input tokens,
260 output tokens (537 cached input tokens). The normalized response contains
one supports candidate, no viewpoint, and one pending relation artifact.
persistArtifacts was false, with no stored artifact/suggestion IDs.

This is evidence against an unintended model switch in that API route, not a
successful browser retry-to-confirm acceptance. CPU latency varies substantially
between the small fixture and actual note structure. Do not extend deadlines
and claim smooth usability; continue actual waiting/cancel/retry acceptance and
the remaining remote/source/writing gates.

## AI settings require an actual reply

Settings previously serialized the entire response as fallback test output,
allowing an empty provider response to look like a successful test. A dedicated
reply validator now requires nonblank text or nonempty structured output and
rejects explicit failed provider status even when it includes text. Unusable
replies leave testStatus failed, clear the running state, and do not resume a
pending action. Settings test errors reuse structured Chinese error copy.
Validator, event-binding and error-copy tests pass 24/24. Existing remote save,
cleared-key, stale-health and configuration-change readiness regressions are
included. Current browser/real remote-provider acceptance is still pending.

## Remote configuration through real HTTPS

New integration coverage starts the actual API against a disposable vault and
a local HTTPS OpenAI-compatible provider. A one-day test certificate is trusted
only through NODE_EXTRA_CA_CERTS on the spawned API process. System trust and
TLS verification are not changed. Only synthetic keys/prompts are used.

Verified wrong-key authentication failure, corrected-key test success, provider
config save/read, actual API process restart, successful persisted-key retest,
key deletion with disabled configuration, failed test after deletion, and
restored-key recovery. Saved config responses do not contain the synthetic key.
Both spawned API processes and the HTTPS fixture are closed before completion.
Windows uses Git's bundled OpenSSL when no PATH executable is available;
OPENSSL_BIN can explicitly select it. Related integration/settings tests pass
25/25. The settings error-copy helper now recognizes the API test endpoint's
nested providerError category as well as analysis providerErrorType.

This proves the real protocol and persistence flow, not a paid third-party model
or the full browser settings interaction. Those acceptance gates remain open.

## Writing AI result safety

Writing checks now guard both request revision and project identity. Contextual
UI state is copied rather than sharing the controller's mutable state object;
late completion after switching projects cannot populate the new project's
results or emit a success notice. Duplicate checks are blocked while loading.
Retry no longer clears the previous successful result before a new result is
available. Failure preserves previous suggestions and user edits. Missing API
results are reported as failures rather than successful checks.

Writing model responses must include at least one recognized array. Invalid
entries, malformed reference lists, incomplete artifacts and references to
notes outside the request are rejected before producing review artifacts.
Explicit empty arrays remain valid; no references are invented as fallback.
Existing local-only provenance, remote confirmation and pending-review behavior
remain covered. Focused writing/executor tests pass 41/41; git diff --check passes
with an existing CRLF warning. This slice does not prove real-model writing or
browser adoption/persistence, and does not implement network cancellation.
No commit, push, packaging or real-vault modifications were performed.

## Real writing model and visible feedback

An actual qwen2.5:7b local writing request with two synthetic Chinese notes timed
out at 120018ms. Compact JSON and brief-output instructions plus a 700-token
local / 1200-token remote output budget were then added, without extending the
deadline. The same local fixture succeeded in 74083ms and produced two writing
moves, one four-section outline and two source gaps. All five were pending
review, referenced supplied IDs, and reported cloudModelUsed false and
canAutoConfirm false. This is a successful model call, not acceptable latency.

Browser inspection exposed writingStrongModelSummary inside the aria-hidden
writing-hidden-workbench: the visible check-outline button ran the model while
both waiting and results were invisible. The existing result host was moved to
the outline pane, stays hidden while idle, and displays waiting/confirmation/
failure states without adding another entry. The old API process, started
before the output optimization, timed out; it was stopped and restarted to
load the changed builder. Browser waiting is now visibly present. Writing
errors now use the existing structured Chinese error helper before contextual
normalization. Focused layout/panel/events/controller/model tests passed 69/69;
the additional visibility test and writing safety batch passed 27/27.

Remaining audit concerns: the request currently does not carry the edited
outline, despite the UI claiming to check it. Actual browser result rendering,
adoption/persistence for source-to-viewpoint, and cancellation still need
acceptance. Do not treat this slice as full goal completion.

The restarted real API/browser call subsequently completed. The outline pane
visibly showed two writing moves and an outline suggestion; closing the result
removed the panel while all four original section titles and points remained
unchanged. Screenshots: writing-ai-wait-visible.png and
writing-ai-result-visible.png. Model quality is NOT accepted: an example about
quantum mechanics was proposed despite neither selected note containing that
subject. It stayed an unadopted AI suggestion, but grounding instructions need
improvement and the display should distinguish missing evidence from sourced
content. The current generic three-row presentation also omits later source-gap
artifacts, and exposes English artifact titles. These are concrete follow-up
items together with sending the actual edited outline. Owned API/web services
were stopped after this acceptance slice; Ollama remains available.

## Current outline input and complete review display

The frontend action plan now snapshots the currently edited scaffold into
currentOutline: article title, ordered section headings, points, source IDs and
open questions. The writing runtime forwards this snapshot; the request builder
includes it in the actual model prompt and asks for concrete checks against its
headings. Continued edits during a pending check stay untouched, and the
returned panel warns that its suggestions use the pre-edit outline version.
Unit coverage proves deep copying of source IDs and the runtime forwarding.
A real API/local provider integration test inspects received messages and proves
the edited section heading/point/source ID survive the whole route.

Only check_outline results now retain up to five suggestions (two moves, one
outline, two gaps); other actions keep their previous three-suggestion limit.
Writing check display keeps payload reasons and gaps, uses Chinese labels for
default English artifact names, and resolves reference IDs to real note titles.
Responses with null/array top-level JSON or writing/outline artifacts missing
source IDs are rejected. Related focused unit tests pass 64/64 and the actual
writing API integration passes 1/1. Diff check passes with the prior CRLF warning.

An actual qwen2.5:7b fixture with contradictory and duplicate outline sections
completed in 92744ms (2074 user-prompt characters), produced five pending-review
artifacts and correctly challenged the supplied heading about fluent recitation
proving understanding. It nevertheless invented a poetry example absent from
both notes and did not clearly identify the repeated section. Therefore model
grounding, diagnostic quality and latency remain NOT accepted. Stronger task
separation / unsupported-example handling should follow; do not call the goal
complete from this successful call. No owned API/web services were started in
this slice. The sole model test process exited; Ollama is retained.

## Diagnostic-only outline checks

Checking an existing outline now uses a separate writing_outline_check task and
checks contract, not the generic writing support contract. The focused module
writing-outline-check.mjs validates issue types, 1-based section positions,
multiple distinct sections for repetition, real source IDs and exact source
excerpts for contradictions. It produces pending WritingMove/SourceGap review
items only, never a replacement outline or example prose. Invalid positions,
invented quotes/IDs and old-generation-shaped responses are rejected. General
writing/source-distillation requests without currentOutline retain their existing
contract. A zero-check result gets a scoped Chinese no-issue summary.

The initial actual local diagnostic run took 69432ms and found repetition at
sections 2/3, but misplaced the contradiction at section 2. The smoke verifier
was tightened: simply seeing both issue types is insufficient; positions must
match the deliberately faulty fixture. Instructions now locate the incorrect
claim itself, avoid reporting the same issue under multiple labels, and quote
only the shortest necessary excerpt. The next actual qwen2.5:7b run completed
in 36001ms, found repetition at 2/3 and contradiction at 1, quoted the exact
source sentence, generated no invented example or replacement outline, and
returned two local-only pending-review items. This proves that fixture, not
universal diagnostic correctness or browser acceptance.

Reusable synthetic smoke script: scripts/smoke-local-writing-check.mjs. Relevant
writing, contextual and source-flow regressions pass 99/99; real API integration
passes 1/1 and inspects the diagnostic task and quote-based review result. Final
post-summary focused tests pass 49/49. Both model-test sessions exited normally;
no owned API/web services remain. Next: fresh browser acceptance of diagnostic
positions/quotes, waiting/cancel/retry, then source-to-viewpoint model and adoption
validation. No commit/push/package and the full AI goal remains active.

## Writing check cancellation and browser retry

The existing outline-check panel now offers Cancel while checking/running.
Cancellation invalidates late frontend completions, aborts the browser fetch,
propagates the disconnected HTTP request into the provider transport and checks
the abort signal before persisting review artifacts. A real API/fake-provider
integration proves transport closure, zero artifacts after cancellation, and a
successful retry that persists exactly one review item. Both writing AI
integration cases pass 2/2.

Output-budget correction: executionDefaults.maxOutputTokens was previously
ignored by executionSettingsFor. It is now read and transmitted as max_tokens;
the earlier 36001ms result did NOT prove an enforced 700-token limit. A focused
test now verifies the configured budget reaches the actual adapter body.

Browser acceptance used only the isolated test-results/ai-browser-20261002/vault
and actual qwen2.5:7b. Cancel returned to idle with all four original headings and
points unchanged. The first browser pass exposed that the cancellation message
was hidden; it now appears in the existing result location and is cleared on
retry, with a regression test. Service-availability exceptions now become failed
states rather than leaving the action in checking, and retry is unit-tested.

The browser retry completed and displayed two located diagnostics; closing them
left the outline unchanged. Model quality remains NOT accepted: it incorrectly
called the distinct explanation and active-recall sections highly repetitive.
No contradiction quote was present in this clean-outline run, so browser quote
acceptance is still pending. Add clean-outline negative cases alongside the
existing deliberately faulty fixture before declaring diagnostics reliable.

Evidence: writing-ai-cancelled-visible.png and writing-ai-retry-result.png.
The focused regression batch passed 67/67 before the availability-error test;
the subsequent contextual/runtime batch passed 43/43. No commit/push/package.
Owned API3095/web5295 are stopped after this slice; Ollama11434 is retained.
Next: diagnostic false-positive controls, then source-to-viewpoint actual-model
generation and confirmed persistence. The full AI goal remains active.

## Repetition grounding and source-specific viewpoint drafts

Repetition checks now require a stated common claim and exact heading/purpose
excerpts from every cited section. Invented excerpts and excerpts copied from
source notes instead of the specified section are rejected. Explicit section
numbers are sent to the model. Instructions distinguish shared topics,
complementary methods and overview/body roles from duplication; outline checks
use temperature 0. The real qwen2.5:7b clean fixture returned no checks in 35582ms.
The original browser outline also returned no issues and retained every section
after closing the result (writing-ai-clean-outline.png).

Full diagnostic quality remains NOT accepted. Earlier clean runs either
misclassified complementary/overview sections or invented section excerpts.
After the system-rule improvement, deliberate faulty runs still missed the
contradiction and wrongly associated repetition with sections 1/3 rather than
2/3 (21934ms and 24112ms). Testing the already installed qwen3.5:9b with thinking
disabled took 90096ms, correctly located/quoted contradiction at section 1, but
missed repetition. The selected app model was not changed. The smoke script
supports --clean and optional --no-thinking for reproducible comparisons; only
the smoke executor sends reasoning_effort:none, not normal app requests.
Do not claim that normal-fixture success proves reliable faulty-fixture recall.

Source distillation no longer silently turns empty model output into a template.
A source-gap-only or outline-only response cannot masquerade as a model-created
viewpoint. The main runner now requests source_note_distillation: one editable
title, coreArgument, explanation, optional questions, one real source ID and a
verbatim supporting quote. A focused source-note-distillation.mjs validates this
contract; it does not produce an article outline or write a note. The preview
uses the structured draft directly and includes its source quote. Generic
writing requests retain their prior contract.

An actual local qwen2.5:7b synthetic-source run completed in 40671ms, produced a
Chinese editable claim about explaining/recalling rather than merely rereading,
retained an exact source quote, and reported local-only, confirmation-required,
autoWrite:false. This proves generation/preview, not adoption or persistence.
Reusable command: node scripts/smoke-local-source-distill.mjs. The real API
integration now also inspects the source-specific provider request, returns the
structured draft without saving artifacts and rejects an invented quote.
Writing AI integration passes 2/2; focused unit regression passes 126/126.
An obsolete executor assertion expecting no output budget was corrected to the
now-enforced remote budget 1200. Diff check passes with the existing CRLF notice.

Next gates: browser editing/adoption of the source-specific draft, disk/readback
and original-source preservation; diagnostic recall/false-positive reliability;
remaining remote-settings browser proof and cancellation on other AI surfaces.
Owned API3095/web5295 and all smoke processes exited. Ollama11434 retained.
No commit/push/package. The full AI goal remains active.

## Source Draft Browser Adoption Follow-Up

The isolated browser/API run used ports 5295/3095 and the test-only vault under
test-results/ai-browser-20261002/vault. No user vault was modified. A temporary
loopback provider proxy on 11435 inspected only synthetic source requests.

Browser inspection found the source AI button was hidden and wired to manual
promotion; assembled host dependencies also omitted runSourceDistillAi. Both
paths are now connected. Failed generation offers retry inside the modal because
the modal backdrop blocks the editor toolbar. Editable fields have accessible
names. Cancelling the destination dialog retains the user's edited draft.

Actual qwen2.5:7b generation produced an editable source-grounded draft for
fn_3c5072e7. The browser edited title, claim and explanation, cancelled once,
retried adoption and created pn_361f3bc8. Refresh and reopen retained those edits;
the Markdown file confirmed the same content and source link. The original
source paragraph remained intact, with a backlink and generated-original marker
appended. This is preservation of source content, not byte-identical preservation.
Screenshot: source-ai-adopted-readback.png.

Inspection also found an empty pending-questions heading and missing AI-assisted
provenance. The generator now omits the empty heading and promotion forwards
authorshipAiAssisted:true for AI drafts only. These follow-up changes passed
focused tests; the saved browser fixture predates those two fixes and is not
evidence of their persisted metadata. Readiness failures are retryable; results
after source-body changes are rejected, and note/vault changes discard stale
results without leaving the old action running.

Focused unit regression: 92/92. Writing AI integration: 2/2. git diff --check
passes (existing CRLF warning only). Remaining gates: source cancellation,
browser proof of follow-up provenance, reliable writing diagnostic recall and
false-positive behavior, remote settings browser proof, final review.
No commit, push or package. Goal remains active.

## Source Cancellation and Provenance Follow-Up

Source generation now owns an AbortController through source-distill-request.js.
The running panel exposes Cancel, the host forwards the signal as request options
(not JSON), and cancellation invalidates the request before its outcome can be
shown. A cancelled panel says the note was not modified and offers Retry.
Replacement requests abort previous transports. Unit tests deliberately deliver
a late successful result after cancellation and prove it remains ignored.

The real browser cancelled qwen2.5:7b generation and displayed the cancelled
state. Source SHA256 before and after cancellation remained
9C99F74FA0F8B8499CAA9403161412A187F3E9263D0B9BC2C3B4B70A59C81D64.
Screenshot: source-ai-cancelled.png. Retry completed with an editable draft;
adoption created pn_d8cc2005, title "理解检验：AI辅助标记验收". Disk inspection
confirmed authorship.ai_assisted:true, user_confirmed:false, source link retained
and no empty pending-questions heading. Screenshot: source-ai-retry-adopted.png.
Adoption is not equivalent to confirming originality or the final viewpoint.

The source-specific HTTP cancellation test proves provider transport closes,
artifact count remains zero and retry succeeds without saving AI artifacts.
Focused units: 94/94. AI integration: 3/3. Diff check passes with the existing
CRLF warning. Temporary browser/API processes were stopped after verification.
Writing diagnostic quality and remote settings browser verification remain open;
this does not complete the full AI goal. No commit/push/package.

## Writing Diagnostic Quality Investigation

The smoke evaluation now supports --transfer (independent work-quality examples)
and experimental --split (separate source and structure requests). Faulty-case
acceptance requires exactly two checks, contradiction at section 1 and repetition
at sections 2/3; extra false positives no longer pass. Clean cases still require
zero checks. The split path exists only in the smoke harness, not the product.

Real qwen2.5:7b experiments remain unsuccessful:
- Compact instructions: reading case 40821ms, correct repetition 2/3 but missed
  the contradiction. Work-quality case 19795ms, correct contradiction 1 but
  missed repetition.
- Inline section sources: 60054ms, copied source text as section evidence; the
  validator correctly rejected it. Inline sources were removed.
- Two-stage experiment: 77187ms, still invented repetition location 1/3 and its
  section quote; rejected. An earlier experiment also omitted empty source IDs.

Compact production prompts were reverted to the previously clean-case-tested
version. No default model changed and no two-call product path was added.
Retained fix: source-free repetition/transition/unclear checks may omit an empty
sourceNoteIds field, normalized to []; explicit invalid types or invented IDs
remain rejected. Contradiction still requires real source IDs and exact quotes.
This fixes a schema compatibility error, not semantic quality or recall.

Focused units pass 17/17; AI integration passed 3/3 during this investigation.
All smoke processes exited. Next: compare available model capability on both
domains and clean controls before changing model guidance or product execution.
Diagnostic quality is still NOT accepted. Full AI goal remains active.

## Model Comparison and Remote Settings Browser Check

qwen3:8b with the smoke-only --no-thinking option failed the faulty reading case
in 67062ms: repetition 2/3 found, contradiction 1 missed. The clean reading
control passed in 9407ms with checks:[]. This is not sufficient to recommend a
model replacement. No user's selected model or inference thinking policy changed.
Model descriptions now state purpose/resource limits rather than "high quality",
"balanced quality and speed" or "stable JSON" promises unsupported by these
results. Catalog and setup regression passed 25/25 during the change.

The browser exposed a real entry-point defect: after local AI was configured,
there was no visible way to change mode, so the remote model field stayed
disabled. The current-state area now has an AI mode select, wired to the existing
runtime controller. The duplicate stop button was removed because Off is one of
the selector options. Browser switching local -> remote exposed editable remote
fields and preserved local qwen2.5 selection separately. Shell/wiring regression
guards the visible selector against being accidentally removed again.

The isolated HTTPS provider fixture on 11436 accepted only a synthetic key and
returned a fixed synthetic reply. API3095 trusted only this test certificate via
NODE_EXTRA_CA_CERTS; certificate verification was not disabled globally.
Browser entered a wrong synthetic key, received the actionable authentication
error and could not save. Correct synthetic key returned the fixed reply and
enabled Save. Screenshot: remote-settings-bad-key.png. No user notes or real
provider credentials were transmitted; no paid service was called.

Save invoked the existing native confirmation and the IAB stopped responding to
CDP/AX; getJsDialog returned undefined and closing the test tab also failed. The
API reported AI_PROVIDER_CONFIG_NOT_FOUND, so browser save/persistence/clear-key
acceptance is NOT complete. User was asked to cancel the native dialog or close
the temporary 5295 tab. This is a browser-control limitation, not proof that the
product save operation succeeded or failed. The isolated API preferences were
restored to local-only qwen2.5:7b. Browser draft state still needs cleanup once
the confirmation is dismissed. All owned API/web/provider processes were stopped;
the blocked temporary tab could not be closed automatically.

Focused settings/model/shell unit regression: 56/56. Diff check passes with the
existing CRLF warning. Next: finish remote save/refresh/clear-key browser proof,
then review remaining AI action coverage and diagnostic model capability.
Goal remains active. No commit, push or package.

## Remote configuration browser closeout

The temporary browser tab recovered. Native settings consent was replaced with
an explicit in-page checkbox scoped to provider, endpoint, model and secret
reference. Editing a key also revokes consent even when the reference is reused.
Individual content-action confirmation remains unchanged.

Browser proof against the isolated synthetic HTTPS fixture:
- Successful synthetic test enabled Save; unchecked consent blocked Save.
- Checked consent saved the actual provider config, verified through API GET.
- Reload displayed the saved endpoint/model and reset consent to unchecked.
- Clearing the key enabled Save Clear without a new test or consent.
- API config became disabled with empty secretRef; local secrets file contained
  zero entries. No real keys, notes or paid providers were used.

Screenshots: remote-settings-readback.png and remote-settings-cleared.png under
test-results/ai-browser-20261002. Focused consent/settings regression: 36/36;
git diff --check passed. Browser/API mode restored to local_only.

First test after reload used a stale draft key and failed authentication; clearing
and re-entering the synthetic key succeeded. The precise draft synchronization
cause is not yet established. Stored-key reuse after restart remains unverified.
Writing diagnostic semantic quality and remaining action cancellation/late-result
audits remain open. Goal stays active; no commit, push or package.

## Contextual action request lifecycle

Remote content consent is no longer reused implicitly by later runs of the same
action. Explicit confirmation supplied by the current UI action still works.
Replacing a cancellable run aborts its previous transport; every new run clears
the old result before availability checks. A late result cannot replace a newer
failure. Controller/model/panel regression: 25/25. Temporary browser tab closed;
ports 3095, 5295 and 11436 confirmed no longer listening. Ollama was retained.

## Permanent note cancellation transport

Note analysis now forwards AbortSignal from the relation overlay through shell
and API client to provider execution. Closing recommendations aborts the request;
the API checks cancellation before fallback and before artifact/suggestion writes.
Editor cache rejects results from a replaced request, inactive note or changed
body; discarded results clear the loading state so retry is possible.

Real HTTP cancellation tests for writing, source distillation and note analysis:
3/3 passed. They prove provider transport closure, no artifacts after cancellation
and successful retry. Editor/relation regression: 42/42 before the final body
guard; final note-feedback tests: 8/8. Syntax and diff checks passed. Browser
click-through of the new relation cancellation path remains to be performed.
Editing a body while a request is running rejects the editor result, but does not
yet abort transport immediately. Availability-check cancellation/races also need
review. The remote draft key mismatch is still unexplained, not declared fixed.
No commit, push or package; goal remains active.

## Preparation lifecycle and browser cancellation

Request identity now exists before availability preparation. Preparation failure
is displayed as an actionable error; closing during preparation prevents later
provider execution. Duplicate clicks are blocked using request.pending, not the
shared suggestion-list loading flag. Browser testing revealed that background
suggestion refresh can clear that flag while model analysis remains active.
The independent request flag fixes both cancellation and duplicate guarding.

Real browser with isolated notes and qwen2.5:7b: local test returned a real reply,
relation recommendation entered waiting state, closing removed the overlay and
the stale running status, and reopening immediately started a new request.
Screenshot: relation-ai-cancelled.png. The transient cancellation success toast
was not captured in AX, so only overlay/status removal and retry are claimed.
Final related unit regression: 63/63; real HTTP cancellation: 3/3. Diff check
passed. Owned API/web sessions exited, temporary tab closed; Ollama retained.
Remaining gates include remote draft synchronization and diagnostic quality.

## Remote test credentials are request-local

Audit found test-chat called upsertLocalAiSecrets before contacting the provider.
Thus merely testing an incorrect replacement key could overwrite a saved working
key, without explicit Save. Test-chat now merges draft key overrides/deletions
into its own in-memory map; only explicit provider configuration save persists
them. This also isolates concurrent tests using the same secret reference.

Real HTTPS integration proves: draft tests create no saved key; incorrect test
and test-only deletion preserve the saved valid key; simultaneous correct and
incorrect tests independently succeed/fail without changing disk; explicit Save
survives API restart; explicit Clear removes the key and subsequent test fails;
explicit restore recovers. Integration passed; payload/event/consent units 31/31.
Syntax and diff checks passed. No real credentials or paid providers were used.
This proves the credential lifecycle fix, but does not yet identify the initial
browser draft-input mismatch. Writing semantic diagnosis remains unaccepted.
No commit, push or package; goal stays active.

## Explicit independent-check prompt experiment

Added two instructions requiring independent source-conflict and chapter-pair
checks, then ran the real qwen2.5:7b smoke. After 51,425 ms it returned only a
repetition at sectionNumbers [3], with evidence for section 2, and no source
contradiction. Strict validation rejected the malformed position/evidence rather
than showing it as a usable suggestion. The prompt experiment was reverted.
Existing shape/provenance/quote executor tests passed 17/17, but semantic quality
remains failed. The original production prompt is retained; no model default or
validation requirement was weakened. No paid service or user notes were used.

## Focused item-level diagnostic experiment

Smoke-only --focused mode isolates section 1/source comparison and sections 2/3
duplication comparison while retaining full production validation and original
section numbers. Faulty reading fixture took 46,992 ms and found both expected
kinds/positions, but the repetition problem said "same topic, different method"
while recommending a merge. This is semantically inconsistent, not acceptance.
The first clean fixture returned unrelated transition output/invalid structure
after 28,024 ms. A narrower per-task output contract still invented a conflict
in the clean fixture after 28,018 ms and concatenated two sources into one quote;
the validator rejected it. No focused strategy was integrated into production.

Smoke output now uses fixtureChecksPassed rather than qualityPassed and flags
manualSemanticReviewRequired, because expected kinds/positions alone do not
prove useful reasoning. Script syntax and diff checks passed; all model process
handles reached terminal state. User was asked whether a configured remote model
may be used with synthetic materials for a possibly billable comparison; no
remote request was made without that answer. Goal remains active.

## Recommended model focused experiment and settings test cancellation

qwen3:8b --focused --no-thinking --clean took 77,978 ms and incorrectly reported
repetition, copied placeholder diagnosis/action strings, and concatenated heading
and purpose into invalid evidence. Validation rejected it. Focused strategy is
still smoke-only; no model/prompt default was changed.

Settings test-chat now carries AbortSignal to the provider. Closing via button,
backdrop or Escape cancels a running test; changing remote configuration cancels
it too. Request revision prevents a cancelled/older reply from displaying success
or resuming pending work. Cancellation is acknowledged in the test result state
and permits retry. Test overrides remain request-local, not persisted.

Settings binding regression 23/23; actual HTTP cancellation for writing, source
distillation, note analysis and settings test-chat 4/4. API syntax and diff checks
passed. Browser click-through of the settings-test cancellation remains open.
All model smoke handles terminated; no temporary services were left running.
Remote comparison still awaits the user's answer. No commit, push or package.

## Settings test cancellation browser acceptance

Real browser click-through against isolated API 3095/web 5295 and local
qwen2.5:7b passed. Started a synthetic prompt, closed while the request was
running, and reopened: result read "已取消测试" / "测试已取消，可以重新测试。"
with the test button enabled. A fresh short test then returned "可以使用" and
"测试成功". The cancelled request did not replace that new result.

Evidence: test-results/ai-browser-20261002/settings-ai-test-cancelled.png and
settings-ai-test-retry.png. The temporary tab and both owned server sessions
were closed; existing Ollama was retained. No user notes or remote providers
were used, and no commit/push/package was performed.

Follow-up usability finding: after successful testing the top action becomes
"已完成", leaving no direct visible local retest entry once the dialog closes.
Also the diagnostic connection status still reads "待测试" while test status
reads "测试成功". These need a focused state/entry audit, not more model trials.
Writing semantic diagnosis and the earlier remote draft-input mismatch remain
unaccepted; the overall AI goal stays active.

## Local diagnostic status and retest entry

Fixed the local connection badge, which previously used only remote provider
readiness and displayed "待测试" alongside a successful local test. It now
requires the current local model's successful test and available runtime, and
handles running, failed/blocked, cancelled, unavailable and off states.
Added "重新测试" inside the collapsed diagnostic section using the existing
dialog-open handler; the primary completion action still resumes pending work.

Focused controls/entry/event/experience regressions passed 45/45. Actual browser
showed both statuses as "测试成功" and the retest button opened the test dialog.
Evidence: test-results/ai-browser-20261002/settings-ai-diagnostic-status.png.
Temporary browser tab and isolated API/web sessions were closed. No remote call,
commit, push or package. Semantic writing diagnosis remains unaccepted.

## Settings mutation cancellation coverage

Audit found local model/runtime-mode changes bypassed the settings test's abort
controller. Existing configuration signatures rejected late replies but left
provider work running. Added cancellation before mode, hybrid preference, user
preference, model pack, local selection, changed advanced model override, runtime
start/stop, delegated local selection, quick setup and relevant primary setup
actions. Unchanged advanced-model blur does not cancel.

Ten direct/delegated mutation regressions prove AbortSignal is aborted, loading
ends, and a deferred successful reply cannot restore success or resume pending
work. Focused binding/runtime/controls/entry suite passed 62/62; diff check passed.
This round did not repeat browser click-through or actual transport integration;
those remain prior evidence for the same cancellation helper/transport, not proof
of every newly covered UI path. No services started, commit/push/package or
remote requests. Writing semantic quality remains the major open acceptance gate.

## Output budget and explicit comparison diagnostic experiments

Added smoke-only --output-tokens=700..4000, --audit-trace and provider usage
reporting. Production prompt, token defaults and validation are unchanged.
qwen2.5:7b with the existing production prompt and 1800 output tokens took
56,235 ms and wrongly marked sections 1/3 as repeating active recall, despite
section 1 claiming fluent memorization proves understanding. It missed the
source contradiction and actual duplicate sections 2/3. Budget expansion did
not resolve the semantic failure; no production budget change was made.

Smoke-only explicit sourceComparisons/pairComparisons with the same 1800 budget
took 65,077 ms. It copied section 3 purpose as a source excerpt and returned a
repetition check missing action/source IDs/section evidence. Strict production
validation rejected it. The comparison strategy remains experimental, not a
product fix. Both process sessions reached terminal exit 1. Script syntax passed;
no paid provider, user notes, service launch, commit/push/package was involved.
The semantic diagnostic acceptance gate remains failed, with evidence that input
role confusion and output-contract noncompliance persist beyond the token limit.

## Compact input and transport audit

Smoke-only --compact-contract separates outlineSectionsToReview from
sourceNotesForVerification and replaces placeholder answer shapes with explicit
field rules. Real qwen2.5:7b took 26,222 ms, used 514 input/77 output tokens and
returned checks:[] for the faulty reading fixture. Faster output is not quality
acceptance; both source conflict and duplication were missed. No compact prompt
was integrated into production. Process exited 1 and script syntax passed.

Inspected the executor/compatible adapter: message bodies are forwarded without
truncation. Actual Ollama show identifies Qwen2.5 7.6B Instruct Q4_K_M; actual ps
reports context_length 4096. This is not proof that every model request retains
context, but does not support blaming the observed compact failure on a short
runtime context. Added a smoke assertion comparing the actual compatible body
messages with the execution request; it will fail on transport mutation in future
probes. Writing executor/analysis/provenance validation regressions passed 17/17.
No production semantic fix yet; goal remains active. No remote call, user notes,
commit, push, package or temporary dev/API service was used in this round.

## Qwen3 normal reasoning and close/retry race

Real qwen3:8b with the production prompt, reasoning not disabled and smoke-only
4000 output budget reached the existing 120,037 ms request timeout. No semantic
result was obtained; the process terminated exit 1. The normal reasoning route
is not accepted for responsiveness or diagnostic quality on this CPU host.
No timeout/default/model setting was changed to hide the failure.

Lifecycle audit found ignore() could await an old result-close callback while a
new check starts, then clear the new check state. The controller now confirms
state ownership and absence of a replacement run before applying close results.
A deferred close/new-run regression proves the fresh running and completed
result survive; contextual/writing-runtime tests passed 45/45 and diff check
passed. No browser click-through for this race in this round. No remote calls,
user notes, temporary dev services, commit, push or package. Goal remains active;
local semantic diagnostic quality is still failed, not merely untested.

## Remote draft preservation on settings refresh

Audit found two concrete overwrite paths: applyActiveAiProviderConfigToState()
without a saved config unconditionally applied default addresses, ignoring draft
flags; refreshVaultSettings() applied asynchronously read preferences and reset
provider draft fields even if the user edited them during the request.

Default addresses now fill only untouched empty fields. Added a focused refresh
guard over editable selection/provider/consent fields: preferences do not apply
over existing drafts or changed inputs, and later provider-config application
is skipped when the editable state changed during its read. Null preference
responses no longer reset selection. Runtime telemetry alone does not invalidate
the guard. Credentials in the in-memory comparison are never logged or persisted
by the guard. Existing save/consent rules are unchanged.

Draft-clear/default, mutation guard and binding regressions passed 38/38; shell
syntax and diff checks passed. No browser delayed-read acceptance in this round;
the earlier intermittent browser auth mismatch is still not declared resolved.
No temporary services, paid calls, commit, push or package. Goal remains active.

## Deferred settings readback regression coverage

Moved the small asynchronous preference/provider-config readback sequence from
the shell into refreshAiSettingsReadback beside its ownership guard. Deferred
tests prove edits made while preferences or configs are pending survive both
responses, unchanged reads apply in order, and read errors preserve the selected
model and existing provider inventory. Previously a failed config read replaced
the inventory with [], which could trigger default configuration fallback.

Focused refresh/state/binding suite passed 41/41; shell syntax passed. Real HTTP
remote-settings integration passed, including draft test isolation, explicit
save/restart/clear and concurrent credential tests. It uses only a synthetic
HTTPS provider/key, not a third-party paid model. Integration-owned services
terminated normally. Browser delayed-read click-through remains open; the
original intermittent browser mismatch is not yet declared fixed. No commit,
push or package. Semantic writing diagnosis remains failed and goal stays active.

## Browser delayed readback and replacement-key reproduction

Isolated browser/API with a local HTTP proxy captured old preference/provider
responses and delayed each 15 seconds. Edited endpoint/model during the reads;
after both old responses were delivered the DOM retained draft.example.test/v1
and draft-model and Save remained gated on testing. Address/model preservation
is browser-proven for this case.

Credential acceptance is NOT passed. Replacing an existing synthetic key with
synthetic-browser-key, then returning through settings/readback, produced a
test-chat payload whose draft key did not match the expected synthetic value;
the synthetic HTTPS provider reported authenticated:false. Clearing the input
then filling the same expected key produced payload match:true, authenticated:
true and visible "测试成功" / "Synthetic remote connection ready". Proxy logs
record only match booleans, not credential values. This reproduces the earlier
replacement/input issue; attribution to browser tooling versus app state is not
yet established. Do not describe it as fixed by the readback guards.

Evidence: test-results/ai-browser-20261002/settings-readback-auth-retry.png.
No Save was clicked; the isolated secret store had zero entries. Restored the
isolated preference to local_only (API readback confirmed), cleared the draft
key, closed the tab and terminated owned API/proxy/web/HTTPS fixture sessions.
Existing Ollama retained. No real credentials, paid service, user notes,
commit/push/package. Goal remains active with credential replacement and semantic
writing quality still open.

## Replacement Key root cause fixed and browser-proven

Boolean-only proxy evidence narrowed the invalid draft to length 40 containing
both synthetic old/new keys, not either expected key or a redaction placeholder.
Found two renderers assigning the same settingsAiSecretRef input: generic
syncSettingsAiInputs wrote the internal secretRef, then provider controls wrote
remoteApiKey. These alternating assignments disrupted the replacement selection.
Removed secretRef assignment from generic input sync; provider controls remain
the sole owner of the API Key value. A regression asserts generic render does
not assign or disturb this input/selection. Related renderer/controls/binding
tests passed 51/51 and diff check passed.

Reloaded the actual browser with the fix, directly replaced an existing key with
synthetic-draft-key then directly with synthetic-browser-key, without a separate
clear step. Actual test-chat payload matched only the new key (length 21, no old
key), synthetic HTTPS provider authenticated:true, UI displayed test success.
Evidence: test-results/ai-browser-20261002/settings-key-replacement-fixed.png.
This supersedes the unresolved attribution in the preceding entry for this
reproduced replacement bug; it does not prove unrelated credential paths.

No Save clicked; isolated secret store zero entries, local_only restored and
confirmed by API. Draft key cleared, browser tab closed, owned API/proxy/web/
fixture sessions terminated. No paid service or real credentials. No commit,
push or package. Overall goal remains active: semantic writing diagnosis failed.

## Comparison-classifier experiment

Added smoke-only --comparison-classifier with a script-local module. It asks for
source conflict and chapter pair judgments, binds section positions and quoted
evidence to actual input in code, and rejects missing tasks, wrong labels,
invented source references and absent shared claims. Six experiment/production
quote-validation regressions passed; both script syntax checks passed.

Real qwen2.5:7b took 93,034 ms (548 input/419 output tokens). It flagged section 1
conflict but its reason compared other chapters as if they were source material,
omitted the conflict sourceNoteId and returned compatible (a source-only label)
for pair 2/3. Validation rejected it. This is not semantic acceptance and no
classifier logic was integrated into product. The experiment covers only conflict
and duplication; transition/evidence/clarity coverage would also be required
before any production replacement. No weakening of the full diagnostic goal.

Session terminated exit 1; no paid model/user notes/temporary dev services used.
No commit/push/package. Goal remains active. Next experiment must isolate each
comparison's input roles rather than accept cross-task label/source confusion.

## Isolated comparison experiment: semantic acceptance failed

Smoke-only --isolated-comparisons separates each chapter/source and chapter pair
into its own sequential request. Code binds task IDs, source IDs and original
quotes; unit regressions cover one-source isolation and source-free pair inputs.
Production prompts, defaults and diagnostic validation remain unchanged.

Real qwen2.5:7b completed six requests in 59,485 ms. Section 1's actual conflict
was correctly explained, but sections 2 and 3 were incorrectly marked conflict
for synonymous wording or "again". Pairs 1/2 and 1/3 were incorrectly marked
duplicate for sharing a topic despite different claims. Pair 2/3 was correctly
marked duplicate. The final production-contract merge rejected the result.
Isolation reduced cross-task mixing but did not establish semantic reliability.
Do not ship this classifier or report writing diagnosis as accepted. A clean
fixture run cannot rescue an already failed faulty-fixture acceptance gate.

The owned smoke session ended exit 1. No production integration, paid service,
real credentials, user-note mutation, commit, push or package. Goal stays active.

## Same-input model comparison: Qwen3 8B

Ran the unchanged --isolated-comparisons fixture on installed qwen3:8b with
--no-thinking, no downloads or cloud calls. Six sequential requests completed
in 104,791 ms. It correctly classified source 1 conflict, source 3 compatible,
pairs 1/2 and 1/3 distinct, and pair 2/3 duplicate. Source 2 was falsely marked
conflict: the model inferred "recall replaces reading" from a chapter that only
said recall reveals gaps. Production-contract merge succeeded, but the fixture
acceptance gate correctly failed because of that extra contradiction.

This is better than qwen2.5:7b on this fixture, not release acceptance. JSON
validity and five correct individual classifications do not excuse a fabricated
conflict. Session ended exit 1. No production model or prompt changes.

## Same-input model comparison: Qwen3.5 9B

Ran installed qwen3.5:9b with the same isolated reading fixture and --no-thinking.
Six requests completed in 169,106 ms. All three source comparisons and pairs
1/2 and 1/3 were correctly classified. Pair 2/3 returned distinct: concrete
execution steps versus an overview/purpose description. The specified fixture
gate failed (one contradiction, no repetition); session ended exit 1.

Manual review identifies an ambiguity in that fixture: chapter 3 only says
"again introduces recall finding gaps", without establishing whether an overview
has an independent role. Do not change the expected gate merely to pass a model,
but do not treat this output alone as proof of an unequivocal model error.
Next use the existing independent work-quality fixture, whose duplicate chapters
both explicitly repeat coworker review and revision with no additional step.
Then evaluate clean complementary chapters and full diagnostic coverage before
considering a production integration. Installed-model comparison has produced
evidence, not a release-ready writing checker.

Experiment isolation and production quote/location tests passed 8/8. No paid
provider, production default change, note mutation, commit, push or package.

## Independent work-quality fixtures: isolated Qwen3.5 classification gates pass

Same installed qwen3.5:9b, --isolated-comparisons --no-thinking --transfer:

- Faulty outline: 113,845 ms, all six classifications correct. Returned exactly
  section 1 contradiction and sections 2/3 repetition, with input-bound original
  evidence. Manual review confirmed the two final diagnostic reasons match the
  supplied claims. Fixture gate passed; process exit 0.
- Clean complementary outline (--clean): 114,475 ms, three compatible source
  judgments and three distinct chapter pairs. Returned checks:[]; fixture gate
  passed; process exit 0. Self-check and coworker feedback were not falsely
  merged. One intermediate pair reason misread "cannot rely only on longer hours"
  as "cannot extend hours". Classification passed, but that reasoning is not
  accurate and must not be presented as a verified explanation.

These independent fixtures improve evidence for isolated conflict/repetition
classification. They do not prove the full production diagnostic task: transition,
evidence gaps and unclear expressions remain outside this experiment; CPU latency
is about two minutes for just three chapters. No production integration or default
model change is authorized by these results. Overall goal remains active.

Both owned model sessions ended normally. Settings regressions passed 57/57 and
diff check passed (existing CRLF normalization warning only). No user-note change,
paid service, commit, push or package.

## Full production-request comparison and rejected action constraint

Installed qwen3.5:9b with smoke-only --no-thinking, --transfer, no classifier:

- Faulty work-quality outline: 94,206 ms, exact contradiction 1 and repetition
  2/3, correct original quotes and positions. Fixture gate passed. Manual review
  found an unsupported causal suggestion in the contradiction action: longer
  hours "may help find errors" was not supported by the supplied note. Accurate
  detection did not establish that all proposed edits were evidence-backed.
- Clean work-quality outline: 16,303 ms, checks:[], no false merge. Fixture gate
  passed. This was faster than the six-call isolated approach on this host.

Tested one additional instruction to keep actions as evidence-backed editing
directions and preserve negations/qualifications. The regression test confirmed
the instruction reached the real request; related tests passed 12/12. Real model
run then took 34,307 ms and omitted the known repeated chapters, returning only
the contradiction in English despite the Chinese writing goal. Gate failed.
Reverted that added instruction and its test; no failed prompt change retained.

All three owned sessions are terminal. Default production model, executor
reasoning behavior, schema and validation remain unchanged. The smoke reasoning
override is not proof of production-default performance. Full diagnostic scope
and recommendation accuracy remain open; next validation must include transition,
evidence gap and unclear-expression cases instead of further tuning only this
one contradiction/repetition fixture. No paid service or user-note mutation.

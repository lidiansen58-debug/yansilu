# AI Legacy `revised` Migration Status

Status: no standalone data repair script is needed yet.

Why:

- The current product still writes `revised` intentionally for AI inbox summary decisions.
- Existing sqlite rows that use `revised` are still part of the live runtime/API contract, not just dead legacy data.
- Running a one-off migration now would create a mixed contract unless the summary flow itself is retired or remapped first.

Current validation:

- `tests/integration/api-vault-settings.test.mjs`
  Verifies the summarize flow still persists `artifact.status = "revised"` and `latestDecision.decision = "revised"`.
- `tests/integration/api-ai-legacy-revised-compat.test.mjs`
  Verifies pre-existing sqlite rows with `status = "revised"` and `decision = "revised"` still load through AI inbox detail/list APIs.

Future migration trigger:

- Stop emitting new `revised` decisions from the summarize route.
- Replace UI/runtime assumptions that still label `revised` as a first-class reviewed state.
- Only then decide whether to:
  - map stored `revised` rows to a new review-first status, or
  - preserve them as read-only historical records with a compatibility adapter.

Migration validation checklist for that later step:

- Old sqlite rows remain readable in AI inbox list/detail.
- Canonical responses stop emitting new `revised` statuses where the review-first contract forbids them.
- Summary history remains inspectable after migration.

# Scheduled Agent Tasks V1

> Status: draft behavior spec
> Date: 2026-05-09
> Workstream: `feat/ai-agent-layer`
> Related: `AGENT_HARNESS_ARCHITECTURE_V1.md`, `AGENT_RUN_LOG_SCHEMA_V1.md`, `AI_ARTIFACT_SCHEMA_V1.md`, `MODEL_ROUTING_POLICY_V1.md`

## 1. Purpose

Scheduled Agent Tasks let the note app proactively read, scan, summarize, and connect information without waiting for a manual chat prompt.

Examples:

- Read papers and research feeds.
- Monitor RSS/newsletters.
- Discover note relationships.
- Generate project digests.
- Surface reflection prompts.

Scheduled tasks should create AI artifacts and inbox items by default. They should not silently change human-authored notes.

## 2. Scheduling Principles

- Scheduled tasks use the same Agent Harness as user-triggered tasks.
- Every scheduled run creates an Agent Run Log.
- Every scheduled output is an AI artifact unless explicitly configured otherwise.
- Scheduled tasks must have budget caps.
- Scheduled tasks must respect privacy gates.
- Users should be able to pause, inspect, and delete scheduled tasks.
- Background work should be quiet unless it finds something worth attention.

## 3. Scheduled Task Record

```json
{
  "scheduled_task_id": "sched_01",
  "name": "Weekly paper scan",
  "status": "active | paused | disabled | failed",
  "task_type": "research_scan | relation_scan | project_digest | reflection_prompt | source_monitor",
  "agent_id": "research_agent",
  "schedule": {
    "type": "daily | weekly | monthly | interval | manual_only",
    "timezone": "Asia/Shanghai",
    "day_of_week": "monday",
    "time": "09:00"
  },
  "scope": {
    "project_ids": ["project_01"],
    "note_ids": [],
    "source_feed_ids": ["feed_01"],
    "keywords": ["agent", "note-taking"]
  },
  "model": {
    "user_mode": "Auto",
    "max_tier": "standard",
    "allow_strong_reasoning": false
  },
  "budget": {
    "max_runs_per_period": 1,
    "max_estimated_cost_per_period": 1.0,
    "period": "week"
  },
  "privacy": {
    "mode": "normal",
    "allow_cloud_models": true,
    "require_confirmation_for_private_notes": true
  },
  "output": {
    "destination": "ai_inbox | research_inbox | project_inbox",
    "artifact_types": ["ResearchCard"],
    "notify_user": "only_if_high_signal"
  },
  "created_at": "iso_datetime",
  "updated_at": "iso_datetime"
}
```

## 4. Task Types

| Task Type | Agent | Default Output | Background Allowed | Notes |
| --- | --- | --- | --- | --- |
| `research_scan` | Research Agent | `ResearchCard`, `SourceSummary` | Yes | Reads papers, feeds, newsletters, webpages |
| `source_monitor` | Research Agent | `ResearchCard` | Yes | Watches selected sources or keywords |
| `relation_scan` | Connection Agent | `LinkSuggestion`, `ConflictSuggestion` | Yes | Scans candidate relations, not full vault by default |
| `project_digest` | Synthesis Agent or Digest Agent | `ProjectDigest` | Yes with budget | Summarizes recent changes in a project |
| `reflection_prompt` | Reflection Agent | `ReflectionPrompt`, `QuestionCard` | Limited | Should be sparse and high-signal |
| `originality_check` | Originality Guard Agent | Guardrail event or artifact | Yes | Checks AI/human boundary on accepted content |

## 5. Default Schedules

Suggested defaults:

| Task | Default Frequency | Default Mode | Notification |
| --- | --- | --- | --- |
| Research scan | Weekly | `Auto` max `standard` | Only if useful source found |
| Source monitor | Daily or weekly | `Economy` or `Auto` | Only if match is high relevance |
| Relation scan | Weekly | `Economy` | Batch suggestions |
| Project digest | Weekly | `Balanced` | Notify project owner |
| Reflection prompt | Weekly or biweekly | `Deep Thinking` only when triggered | Low frequency |

Novice users should not start with many scheduled tasks enabled. MVP should offer one or two clear templates.

## 6. Budget Rules

Scheduled tasks must have hard budget boundaries.

Budget controls:

- Max runs per period.
- Max sources per run.
- Max Context Pack tokens.
- Max estimated cost per run.
- Max estimated cost per period.
- Max model tier.
- Stop-on-budget-exceeded behavior.

If budget is exceeded:

```text
pause task run
create Run Log event
show quiet notification or settings warning
do not retry with expensive model
```

## 7. Privacy Rules

Scheduled tasks are riskier than foreground user actions because they run without immediate attention.

Rules:

- Do not include private notes unless the scheduled task scope explicitly allows it.
- Do not use cloud models for `local_only` scopes.
- Require confirmation before a scheduled task first reads a private project.
- Never write to human-authored notes.
- Store outputs as artifacts in pending review state.

## 8. Output and Notification Rules

Scheduled output destinations:

- `ai_inbox`
- `research_inbox`
- `project_inbox`
- `reflection_queue`

Notification levels:

- `silent`: run completes without notification.
- `only_if_high_signal`: notify only for high relevance or important issue.
- `digest`: batch notification.
- `always`: notify after every run, mostly for power users.

Default:

```text
only_if_high_signal
```

## 9. MVP Templates

### 9.1 Weekly Research Scan

Purpose:

- Read selected paper/RSS/news sources.
- Create ResearchCards.
- Link them to related notes.

Defaults:

- Frequency: weekly.
- Model mode: `Auto`.
- Max tier: `standard`.
- Output: research inbox.
- Notification: high-signal only.

### 9.2 Weekly Link Suggestions

Purpose:

- Find possible links among recent notes and selected projects.

Defaults:

- Frequency: weekly.
- Model mode: `Economy`.
- Max tier: `standard`.
- Output: AI inbox.
- Notification: digest.

### 9.3 Reflection Reminder

Purpose:

- Surface one high-quality question about recurring themes.

Defaults:

- Frequency: biweekly.
- Model mode: `Balanced` or `Deep Thinking` depending on budget.
- Output: reflection queue.
- Notification: high-signal only.

## 10. Scheduled Run Flow

```text
Scheduler wakes task
  -> budget precheck
  -> privacy precheck
  -> Task Intake creates task envelope
  -> Context Builder creates Context Pack
  -> Model Policy selects provider/model
  -> Agent Harness executes run
  -> Artifact Writer stores outputs
  -> Run Log records usage, tools, errors, fallback
  -> Notification policy decides whether to surface result
```

## 11. Failure Handling

Failure states:

- Source unavailable.
- Provider unavailable.
- Budget exceeded.
- Privacy blocked.
- Tool error.
- Output validation failed.
- User confirmation missing.

MVP behavior:

- Log the failure.
- Do not spam user on transient failures.
- Pause task after repeated failures.
- Show plain-language task health in settings.

## 12. MVP Scope

MVP scheduled tasks:

- Weekly Research Scan.
- Weekly Link Suggestions.

MVP required infrastructure:

- Scheduled task records.
- Budget caps.
- Privacy gates.
- Run logs.
- Artifact outputs.
- Pause/resume/delete.

Post-MVP:

- Project digests.
- Reflection reminders.
- Adaptive schedules.
- Provider health-aware scheduling.
- User feedback-based task tuning.

## 13. Current Implementation Slice

The first implementation slice now covers:

- Normalized scheduled task records.
- In-memory scheduled task store.
- SQLite scheduled task store.
- Due-task listing for active tasks.
- Pause, resume, delete, and run-state updates.
- A thin scheduled-task runner that converts due tasks into Agent Harness runs with `trigger: scheduled_task`.
- Novice-safe templates for weekly link suggestions and reflection reminders.
- A contract-only weekly research scan template that stays paused until source-reader contracts and Research Agent support are ready.
- Provider health preflight before scheduled model calls.
- Scheduled-task skip behavior when the primary provider is down and no allowed fallback exists.
- Healthy fallback provider selection when policy allows it.
- Persisted skipped-run reason for later settings/UI explanation.
- Scheduled-task budget preflight before provider health and harness execution.
- Run-count, per-run planned cost, and period-spend skip reasons for background tasks.
- Skipped scheduled runs now create Agent Run Log records with `scheduled_task_preflight` events.
- Scheduled task records store the skipped run id, status, and reason for later diagnostics.

This slice intentionally does not yet include a real desktop/cloud scheduler, paper/RSS fetching, notification delivery, or adaptive scheduling. Those should be added after core note APIs and source-reading contracts are stable.

## 14. Open Questions

- Should scheduled tasks run when the desktop app is closed?
- Should cloud-hosted scheduled tasks be available for local-first users?
- How many scheduled tasks should novice users see at onboarding?
- Should scheduled tasks be workspace-level, user-level, or project-level?

Provider health-aware skip and fallback behavior is defined in `PROVIDER_HEALTH_AND_FALLBACK_POLICY_V1.md`. Health check execution is defined in `PROVIDER_HEALTH_CHECK_RUNNER_V1.md`.
- Should sources be fetched before or after model budget checks?
- How should repeated low-value task outputs reduce future frequency?


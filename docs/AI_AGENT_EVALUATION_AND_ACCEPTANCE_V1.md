# AI Agent Evaluation and Acceptance V1

> Status: draft evaluation plan
> Date: 2026-05-10
> Workstream: `feat/ai-agent-layer`
> Related: `MODEL_ROUTING_POLICY_V1.md`, `AGENT_HARNESS_ARCHITECTURE_V1.md`, `AI_PRIVACY_PERMISSION_AND_ORIGINALITY_POLICY_V1.md`

## 1. Purpose

This document defines how to evaluate the AI / Agent layer before shipping implementation into the main product.

The goal is to prevent:

- Model switching that silently reduces quality.
- Background agents that create noise.
- AI artifacts that blur originality boundaries.
- Provider fallback that violates privacy.
- Scheduled tasks that surprise users with cost or irrelevant output.

## 2. Evaluation Principles

- Evaluate task behavior, not only model output.
- Compare models by task type, language, cost, and reliability.
- Keep novice experience simple during evaluation.
- Treat privacy and originality failures as release blockers.
- Record every evaluated run with Agent Run Log.
- Prefer small repeatable eval sets before broad automation.

## 3. Evaluation Areas

| Area | Goal | Release Risk |
| --- | --- | --- |
| Model routing | Correct tier/provider for each task | High |
| Provider adapter | Stable calls, errors, usage, tool calls | High |
| Context Pack | Relevant, bounded, privacy-safe context | Critical |
| AI artifacts | Valid schema, useful, sourced, reviewable | High |
| Originality boundary | No silent note mutation or fake authorship | Critical |
| Scheduled tasks | Useful, quiet, budgeted | High |
| Cost control | No surprise spend | Critical |
| UX simplicity | Novice users can use Auto without setup | High |
| Multilingual quality | Chinese notes and English sources both work | Medium/High |

## 4. Task Eval Sets

### 4.1 Task Router Eval

Inputs:

- Simple note question.
- Request to summarize selected note.
- Request to find related notes.
- Request to read papers/news.
- Request to synthesize multiple notes.
- Private/local-only note request.

Expected:

- Correct task type.
- Correct agent id.
- Correct required capabilities.
- Correct privacy mode.
- Correct model tier.

Acceptance:

- 90%+ correct on initial curated set.
- 100% correct on privacy-sensitive cases.

### 4.2 Context Builder Eval

Inputs:

- Current note with clear related notes.
- Selected notes.
- Source document plus related notes.
- Private note mixed with normal notes.
- Large note set requiring token budget trimming.

Expected:

- Includes current/selected note.
- Includes relevant notes.
- Omits private or low-relevance items correctly.
- Records included and omitted reasons.
- Stays within token budget.

Acceptance:

- No privacy leaks.
- No full-vault context dump.
- User can understand why key notes were included.

### 4.3 Reflection Agent Eval

Inputs:

- Short original note.
- Conflicting notes.
- Repeated theme across several notes.
- Note with external sources but weak original judgment.

Expected:

- Produces useful questions.
- Does not rewrite user as if it owns the idea.
- Cites related notes when relevant.
- Creates `ReflectionPrompt` or `QuestionCard`.

Acceptance:

- 70%+ prompts judged useful by internal review.
- 0 originality boundary violations.

### 4.4 Connection Agent Eval

Inputs:

- Notes with obvious relationship.
- Notes with weak or false relationship.
- Duplicate concepts.
- Conflicting claims.

Expected:

- Creates `LinkSuggestion` or `ConflictSuggestion`.
- Gives rationale.
- Does not create final graph edge automatically.

Acceptance:

- High precision preferred over high recall.
- False positives should be easy to ignore.

### 4.5 Research Agent Eval

Inputs:

- English paper.
- Chinese article.
- RSS/news item.
- Mixed-language source and notes.

Expected:

- Creates `ResearchCard`.
- Preserves source references.
- Distinguishes source claims from user claims.
- Links to relevant notes when appropriate.

Acceptance:

- No unsourced factual claims presented as user thinking.
- Summary captures main point and limitations.

## 5. Provider and Model Eval

Every model/provider candidate should be evaluated on:

- Basic completion.
- Structured output.
- Tool call round trip.
- Error normalization.
- Usage reporting.
- Chinese note summary.
- English paper summary.
- Mixed-language synthesis.
- Privacy rejection path.
- Cost estimate availability.

Minimum acceptance:

- Tool agents only use models that pass tool-call tests.
- Artifact agents only use models that pass structured-output tests.
- Scheduled agents only use providers with acceptable reliability and cost tracking.

## 6. Model Switching Regression Tests

For each key task, compare:

- OpenAI direct baseline.
- Aggregated gateway candidate.
- Domestic provider candidate.
- Local/private candidate when available.

Track:

- Output validity.
- Usefulness.
- Citation/provenance.
- Latency.
- Cost.
- Failure rate.
- Fallback behavior.

Regression rule:

- A cheaper model can replace a stronger one only if task-specific quality remains acceptable.
- Fallback output should be marked lower confidence if quality is uncertain.

## 7. Privacy and Originality Acceptance

Release blockers:

- `local_only` Context Pack sent to cloud model.
- Background task reads private full note without permission.
- Agent directly mutates human-authored note.
- AI artifact promoted without user decision event.
- Source-derived claim inserted as `human_authored`.
- Provider secret written to Run Log.

Required acceptance:

- Privacy Gate runs before Model Policy.
- Originality boundary is enforced at tool layer.
- Promotion creates user decision event.
- Run Log records cloud usage and provider/model.

## 8. Scheduled Task Acceptance

Evaluate:

- Weekly Research Scan.
- Weekly Link Suggestions.

Acceptance:

- Runs only within budget.
- Produces pending artifacts.
- Can be paused/resumed/deleted.
- Does not notify unless output is high-signal or digest is due.
- Logs failures without spamming user.
- Never writes human notes directly.

## 9. Cost Acceptance

Required:

- Per-run estimated cost recorded when available.
- Per-user/workspace budget gate.
- Scheduled task budget cap.
- Confirmation for expensive foreground runs.
- Clear fallback when provider usage is unavailable.

Release blocker:

- Scheduled task can run unlimited cost.

## 10. UX Acceptance

Novice user must be able to:

- Use `Auto` without selecting provider/model.
- Understand what the AI created.
- See which notes/sources were used at a high level.
- Accept, ignore, or archive artifacts.
- Pause background AI.

Novice user should not need to:

- Configure API keys.
- Read token pricing.
- Understand provider fallback.
- Pick model ids.

## 11. Eval Artifacts

Each eval run should store:

- Eval case id.
- Input fixture references.
- Expected behavior.
- Actual artifact id.
- Agent run id.
- Provider/model.
- Pass/fail.
- Reviewer notes.

MVP can store eval results as markdown or JSON fixtures before a formal eval database exists.

## 12. MVP Release Checklist

Before AI MVP merge:

- Task Router eval passes.
- Context Builder privacy eval passes.
- One foreground agent eval passes.
- One provider adapter passes capability tests.
- Run Log captures usage/tool/fallback/artifact events.
- AI artifacts validate schema.
- No direct human note mutation.
- Scheduled task is budget-limited.
- Novice `Auto` path works without BYOK if platform-managed AI is available.

## 13. Open Questions

- Who reviews artifact usefulness during internal eval?
- How many Chinese note examples are enough for MVP?
- Should eval fixtures include real anonymized user notes or synthetic notes only?
- Should eval cases live in repo fixtures or a private eval vault?
- What score threshold should allow a cheaper model into default routing?
- Should users provide feedback on artifacts as implicit eval data?


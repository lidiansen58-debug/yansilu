# Goal Quality Guardrails

## Goal

Keep goals short without lowering development quality.

This guide exists to prevent a common failure mode:

- the goal is too large
- the prompt gets shortened
- validation disappears
- quality drops

Short goals should reduce drift and token waste, not lower the engineering bar.

## Core Rule

Compress scope, not standards.

That means:

- reduce the number of outcomes in one goal
- reduce unrelated files in scope
- reduce unnecessary upfront testing
- keep the minimum quality checks

## The 5 Quality Checks

Before starting a short goal, confirm all five:

1. The goal has one result.
2. The file or module scope is explicit.
3. The change has a smallest relevant validation step.
4. The goal has a stopping condition.
5. The prompt does not silently turn into refactor, cleanup, help rewrite, or review expansion.

If two or more of these are unclear, rewrite the goal before execution.

## Minimum Quality Standard

A short goal still needs:

- read the relevant code first
- change only directly related files
- run the smallest relevant validation after the change
- stop at reviewable state
- report boundary expansion before continuing

## Default Execution Rules

Append these rules to short goals by default:

```text
Do not expand this into a refactor.
If scope starts growing, stop and report the boundary issue first.
Prefer editing existing modules over introducing large new abstractions.
After changes, run only the smallest validation needed for this goal.
```

## Good Short Goal Pattern

```text
/goal
Working directory: <path>
Branch: <branch>
Goal: <one-sentence result>

Only do:
- <up to 3 items>

Do not do:
- <2 to 4 excluded items>

Do not run tests first.
Only change directly related files.
Do not expand this into a refactor.
If scope starts growing, stop and report the boundary issue first.
Prefer editing existing modules over introducing large new abstractions.
After changes, run only the smallest validation needed for this goal.
Stop once the task reaches reviewable state.
```

## Smells

Treat the goal as high-risk if:

- it contains both "fix" and "refactor"
- it mixes feature work and help/doc cleanup
- it touches a large prototype entry file without scope limits
- it asks for implementation, testing, review, and follow-up fixes in one round
- it uses broad words like "polish", "improve", "finish", or "complete the whole flow"

## Recommended Workflow

1. Short implementation goal
2. Small validation
3. Reviewable stop
4. Separate review or usability pass

This is the default quality-preserving path for Yansilu.

# Thread Opener Cheatsheet

Use these short openers for the most common Yansilu task types.

## 1. Bugfix

```text
Working directory: <path>
Branch: fix/<name>
Goal: fix <bug>

Do not run tests first.
First inspect the relevant files and confirm the reproduction path.
Only handle the current bug.
Only change: <module/file scope>
After changes, run only the smallest relevant validation.
Stop once the task reaches reviewable state.
```

## 2. Feature

```text
Working directory: <path>
Branch: feat/<name>
Goal: <one-sentence feature goal>

Do not run tests first.
Only handle the current feature goal.
Only change: <module/file scope>
Code organization rules:
- Do not keep adding new business logic into prototype entry files.
- If this change introduces a new responsibility, extract one directly related small module.
- Prototype entry files should stay focused on assembly, wiring, and module composition.
After changes, run only the smallest relevant validation.
Stop once the task reaches reviewable state.
```

## 3. Review

```text
Working directory: <path>
Branch: <branch>
Goal: decide whether this slice is ready to merge

Do not start new feature work.
Only check for bugs, scope creep, missing tests, and whether the stated stopping condition is satisfied.
Give a clear merge-ready or needs-fixes conclusion, then stop.
```

## 4. Chinese Docs / Copy / File Writing

Append this add-on when the task touches Chinese docs, UI copy, JSON/Markdown content, or scripts that write files.

```text
Encoding rules:
- Treat all created or edited text files as UTF-8.
- If a script writes files, it must set UTF-8 explicitly.
- If terminal output looks garbled, verify with explicit UTF-8 read before treating the file as corrupted.
```

## Fast Rule

- bug -> use `Bugfix`
- new slice -> use `Feature`
- merge judgment -> use `Review`
- any Chinese text or file-writing script -> append `Encoding rules`

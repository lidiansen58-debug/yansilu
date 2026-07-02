# Codex Encoding Prompt Snippets

## Goal

Use these snippets when a task may create or edit Chinese text, UI copy, Markdown docs, JSON content, or script-generated files.

They are intentionally short so they can be pasted into a new thread or `/goal` prompt without adding much token cost.

## Default Snippet

```text
Encoding rules:
- Treat all created or edited text files as UTF-8.
- If a script writes files, it must set UTF-8 explicitly.
- If terminal output looks garbled, verify with explicit UTF-8 read before treating the file as corrupted.
```

## Doc And Copy Snippet

Use this when the task includes Chinese docs, product copy, or mixed Chinese/English text.

```text
Text rules:
- Keep Chinese docs and UI copy in UTF-8.
- Do not rewrite files through tools with unclear encoding behavior.
- After editing Chinese content, do a quick explicit UTF-8 read when needed.
```

## Script Writing Snippet

Use this when the task adds or edits scripts that write files.

```text
Script file-write rules:
- PowerShell file writes must use UTF-8.
- Node and Python file writes must specify utf-8 explicitly.
- Do not rely on terminal-local default encoding for file output.
```

## Minimal Thread Opener Add-on

Append this to a normal worktree/thread prompt when needed:

```text
Extra constraints:
- If this task touches Chinese text or docs, keep everything on UTF-8.
- If you add a script that writes files, set UTF-8 explicitly.
- Do not turn encoding cleanup into a broader refactor.
```

## When To Use

Use one of these snippets when:

- editing docs under `docs/`
- changing Chinese UI copy
- generating JSON or Markdown fixtures with Chinese content
- writing migration or data seeding scripts
- touching import/export text handling

Skip them for pure logic-only changes that do not read or write user-facing text.

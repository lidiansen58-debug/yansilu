# Context Handoff: Editor QA 2026-05-09

## Scope

This handoff records the latest verification pass for the editor issues reported by the user on 2026-05-09. The main working directory is:

`E:\Projects\Thinking in Notes\yansilu`

## Verification Environment

- API: `http://127.0.0.1:3000`
- Web: `http://127.0.0.1:5173/prototype`
- Browser automation used: Playwright fallback from local shell.
- Codex in-app Browser connection timed out twice, so rendered QA was completed with Playwright.

## What Passed

- 2026-05-09 follow-up: related/backlink sidebar copy has been shortened.
- 2026-05-09 follow-up: focus mode e2e assertions now match `专注模式` / `已开启专注模式` / `已退出专注模式`.
- 2026-05-09 follow-up: added a focused e2e regression test for ordinary blank paragraphs in the source editor.
- 2026-05-09 follow-up: added a click-based WYSIWYG e2e regression test for ordinary blank paragraphs.
- 2026-05-09 follow-up: literature notes now include a citation metadata section and block `记录原创` until required citation fields are present.
- Editor can insert a blank line in source mode. Verified by pressing Enter twice between `Line one` and `Line two`; resulting markdown included `Line one\n\nLine two`.
- Editor can insert a blank line in WYSIWYG mode. Verified by clicking the rendered `Line one` paragraph, pressing Enter twice, typing `Line two`, and confirming the stored markdown included `Line one\n\nLine two`.
- `专注提炼` has been changed to `专注模式` in the visible UI and focus mode status.
- Focus mode hides the related/backlink panel and shows the low-distraction intent text.
- The old phrase around side-chain or growth context was not found in current app code. Current text uses simpler terms such as backlinks, tags, and related judgments.
- The visible standalone `收起` button is not shown in normal UI; relation sidebar is controlled through the toolbar icon.
- Manual save button is hidden in the editor. The flow now presents automatic sync / dirty state instead of a user-facing save concept.
- Editor toolbar is sticky/floating enough to remain visible while the editor panel scrolls.
- Tag and link buttons open compact floating pickers near the cursor context. Verified both panels had `inline-picker floating` classes.
- Uploaded file attachment preview opens without 4xx asset responses. Verified PDF attachment opened in the preview modal.
- Chinese `#tag` rendering works when inserted as a real Unicode tag, e.g. `#中文标签`. It renders as a clickable preview tag and clicking it runs SQLite tag search.
- Bottom directory metadata has been removed from the visible footer. Only `statusBar` remains.
- Literature note citation metadata is covered in the note template, parser, product docs, and e2e. Required fields before `记录原创`: citation title, author, year, locator, and at least one DOI/ISBN/arXiv/URL/PDF-style trace identifier.

## Remaining Issues

- No remaining issue from this editor QA list is currently unverified in the targeted Playwright checks.

## Useful Commands

Targeted passing checks:

```powershell
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none --test-name-pattern "prototype editor inline wikilink picker inserts ranked candidate|prototype editor inline tag picker inserts SQLite-backed tag suggestion|prototype editor inserts uploaded file into markdown and preview action" .\tests\e2e\prototype-browser.test.mjs
```

Focused follow-up check:

```powershell
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none --test-name-pattern "prototype editor focus mode switches into a low-distraction writing chrome|prototype editor enter preserves ordinary blank paragraphs|prototype editor enter continues list quote and checklist structures" .\tests\e2e\prototype-browser.test.mjs
```

WYSIWYG blank-line regression:

```powershell
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none --test-name-pattern "prototype editor enter preserves ordinary blank paragraphs|prototype editor enter preserves ordinary blank paragraphs in wysiwyg|prototype editor enter continues list quote and checklist structures" .\tests\e2e\prototype-browser.test.mjs
```

Literature citation metadata and blank-line combined regression:

```powershell
$env:RUN_BROWSER_E2E='1'; node --test --test-isolation=none --test-name-pattern "prototype editor enter preserves ordinary blank paragraphs|prototype editor enter preserves ordinary blank paragraphs in wysiwyg|prototype editor enter continues list quote and checklist structures|prototype literature note can record an original draft through the unified editor flow|prototype literature note requires citation metadata before recording original|prototype editor keeps content editable when toggling source and wysiwyg with related panel open" .\tests\e2e\prototype-browser.test.mjs
```

## Suggested Next Work

1. Run a full browser e2e sweep before release if time allows; this pass intentionally focused on the reported editor issues.

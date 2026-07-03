# Yansilu v0.1.1-beta.1 Release Notes

Yansilu v0.1.1-beta.1 is a Windows desktop beta for close testers who want to try the core card-note writing workflow end to end.

## What's Included

- Beginner-first empty vault entry with Demo import, Obsidian folder import, and first-note creation.
- Smart Notes Demo that teaches the workflow through notes: source material, literature notes, permanent notes, relation reasons, theme indexes, writing center, and review.
- Today organizing path for finding the next useful action: connect an unlinked permanent note, form a writable theme, or continue into writing.
- Relation workflow for turning notes into a knowledge network with user-confirmed relation type and rationale.
- Theme index and writable-theme suggestions that remain suggestions until the user confirms them.
- Writing center flow from selected permanent notes to writable theme, outline, and draft.
- Local AI setup guidance for Ollama-supported workflows, with AI suggestions kept review-first.
- Desktop auto-update infrastructure and release manifest support, with update installation reserved for signed release artifacts.

## Final Beta Polish

- Demo guide now opens at the beginning on mobile instead of landing near the lower product-feature section.
- Mobile editor toolbar remains horizontally scrollable, so compact screens do not hide editing actions.
- Repeat Demo import opens the existing guide with a beginner-friendly status instead of exposing technical database wording.
- AI review and suggestion panels have stronger stale-selection safeguards.
- Already processed AI inbox items no longer show actions that would fail.

## Known Limitations

- Windows installer is unsigned and may trigger SmartScreen warnings.
- This beta depends on the local API service at `http://localhost:3000`.
- Updater artifacts are disabled for the local beta build; one-click update should wait for signed release feeds.
- External-link WYSIWYG browser smoke passes but is still slow.
- Native installed-WebView checks for file dialogs and OS shell reveal/open actions should be repeated before sharing beyond close testers.

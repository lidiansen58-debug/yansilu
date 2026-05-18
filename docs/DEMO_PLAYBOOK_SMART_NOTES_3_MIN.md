# Smart Notes Demo Playbook (3 Minutes)

Date: 2026-05-16

## Goal

Show that Yansilu is not a generic note archive. It helps a user move from reading material to owned judgment, from owned judgment to connected themes, and from connected themes to writing.

## Preflight Setup

Use the public demo entry for the normal walkthrough:

```text
/demo/zettelkasten
/prototype?demo=smart-notes-product-thinking
```

The prototype entry auto-seeds the disposable demo data through the public API endpoint and opens the guide note `GUIDE-SN-001`. Do not seed into `vault-example`, the normal development vault, or any vault that contains user or baseline data.

For clean recording prep, you can still seed or reset a local disposable demo vault explicitly:

```powershell
$env:DEMO_VAULT="E:\Projects\Thinking in Notes\.local-demo-vaults\smart-notes-product-thinking"
node scripts/seed-smart-notes-product-thinking.mjs --vault $env:DEMO_VAULT
```

The generated vault is safe to delete and regenerate. It is not a source asset, not a fixture, and not intended for commit. The source of truth remains the checked-in fixture plus seed path described in `docs/RICH_DEMO_USAGE_ENTRY.md`.

After opening the prototype entry:

1. Confirm the status bar says the Smart Notes demo imported 100 permanent notes, 306 relations, and 1 writing project.
2. Confirm the first selected note is `GUIDE-SN-001`.
3. Keep the graph, index cards, and writing project panels ready.
4. Verify you can open `PN-SN-005`, `IC-SN-002`, `WP-SN-PM-001`, and `DS-SN-PM-001`.
5. If the workspace contains unrelated notes, discard the generated vault and seed a fresh disposable vault before recording or presenting.

## Demo Order

Use this order even if the audience asks feature questions early:

1. Start with the source/originality boundary.
2. Show a rough fleeting note and one literature note.
3. Show a permanent note as owned judgment.
4. Show graph relations with reasons.
5. Show an index card as a question-centered entry point.
6. Show the writing project and scaffold.
7. Close on traceable writing readiness, not note volume.

## Talk Track

### 0:00-0:30 - Frame The Demo

This is a product-thinking demo based on the method of *How to Take Smart Notes*. It is not a book summary. The point is to show how reading becomes a reusable product judgment and then becomes writing.

Call out the source boundary first: the demo uses original paraphrases and product-manager restatements, not copied book text, long passages, or chapter-level replacement summaries.

Also call out the data boundary: this is generated demo data in a disposable local vault. It should be regenerated from the seed path, not preserved by hand or mixed into the main example vault.

### 0:30-1:10 - Reading Becomes Notes

Open the guide note `GUIDE-SN-001`, then show the two fleeting notes.

Explain that fleeting notes are intentionally unfinished. They are useful capture, but the product should push them toward processing or deletion.

Open one literature note and point to:

- original paraphrase
- personal takeaway
- candidate permanent notes

Say explicitly that a literature note is still transitional. It keeps the source trace visible while requiring the user's own words before anything can become an owned judgment.

### 1:10-1:50 - Notes Become Judgments

Open representative permanent notes:

- `PN-SN-001`: writing starts before drafting
- `PN-SN-037`: note count can mislead progress
- `PN-SN-065`: index cards create entry points
- `PN-SN-100`: the final essay should preserve traceability

For each note, point to thesis, three-line summary, product-manager restatement, product implication, and boundary.

The key line: permanent notes are not copied fragments. They are claims the product manager can reuse, challenge, connect, and later write from.

### 1:50-2:25 - Judgments Become Structure

Switch to graph and index cards.

Show that relations have types and rationales. The network is not decorative: every edge should explain why two notes belong together, disagree, extend each other, or create a writing move.

Open `IC-SN-001`, `IC-SN-005`, or `IC-SN-010` to show question-centered organization.

### 2:25-3:00 - Structure Becomes Writing

Open `WP-SN-PM-001` and `DS-SN-PM-001`.

Show that the writing project starts from selected permanent notes and index cards. The scaffold should expose evidence, gaps, counterpoints, and source traces.

Close with the product message: Yansilu should reward confirmed judgment and traceable writing readiness, not raw collection volume.

Do not present the demo as a substitute for reading the source book. It is a Yansilu product walkthrough that demonstrates how a user can transform source-informed learning into their own accountable writing.

## Reset And Cleanup

- Treat `E:\Projects\Thinking in Notes\.local-demo-vaults\smart-notes-product-thinking` as disposable/generated.
- Re-run the seed command before an important walkthrough if you need a clean state.
- Do not manually copy generated notes into `vault-example`.
- Do not commit generated vault files, local SQLite state, or one-off markdown exported from a demo run.
- If a demo exploration changes the local vault, delete the generated vault and seed it again instead of trying to curate it by hand.

## Acceptance Checklist

- The visitor understands why `/demo/zettelkasten` is the primary product demo.
- The visitor sees that demo notes are original paraphrases and PM restatements.
- The visitor understands that the local demo vault is disposable/generated.
- The graph is explained through relation reasons, not visual density.
- The writing project shows how notes become an essay path.
- The demo does not present itself as a replacement for the source book.


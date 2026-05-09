# Thinking And AI Boundaries

## 1. Document Goal

This document defines two non-negotiable boundaries for Yansilu:

1. External material must not substitute for understanding.
2. AI must not substitute for understanding.

These boundaries are not feature ideas. They are product constraints that should guide
interaction design, AI orchestration, validation rules, and acceptance criteria.

---

## 2. Core Position

Yansilu is not designed to help users merely collect information, and it is not designed
to let AI think on the user's behalf.

Its purpose is to help users turn:

`material -> understanding -> judgment -> structure -> writing`

Any workflow that weakens this chain should be treated as a product regression, even if it
looks more convenient in the short term.

Another way to state this boundary is: Yansilu should resist the projection of power onto
external objects. Saved excerpts, progress counters, and AI fluency can all create the false
sense that thinking has already happened elsewhere. The product should keep returning that
power to the user's own judgment.

---

## 3. Boundary One: Excerpting Is Not Completion

### 3.1 Why this matters

Concepts and language can create the illusion of understanding.
Users may feel that they have "processed" a text when they have only copied it, stored it,
or highlighted it.

Yansilu must actively resist the habit of treating excerpting as completion.

### 3.2 Product interpretation

Literature notes are not trophies of reading.
They are a transition layer between source material and the user's own understanding.

Saving an excerpt is not enough.
A literature note is only meaningfully advanced when the user has paraphrased, interpreted,
or positioned the material for later judgment.

### 3.3 Required product behavior

1. Literature-note editing should separate source text from paraphrase.
2. A literature note without paraphrase must not be considered completed.
3. Permanent notes should warn when their language remains too close to source material.
4. The system should repeatedly push the user from "stored text" toward "owned meaning".

### 3.4 Required guiding questions

The product should surface prompts like:

1. What do you actually understand this material to mean?
2. Why do you want to keep it?
3. What judgment or claim could it support?

These prompts should appear in literature-note and writing-transition workflows, not as
marketing copy but as operational guidance.

### 3.5 Interaction rules

1. Literature-note editor:
   - left side: source excerpt
   - right side: paraphrase / user's wording
2. Completion gating:
   - no paraphrase -> cannot mark literature note as completed
3. Permanent-note originality guard:
   - high similarity to source -> warning or block depending on threshold
4. Writing handoff:
   - moving from literature note to permanent note should privilege:
     - source excerpt
     - my paraphrase
     - supported judgment

---

## 4. Boundary Two: AI Is Not a Thinking Substitute

### 4.1 Why this matters

AI can mirror humanity's reverence for logic, fluency, and apparent rationality.
That mirror is useful only if it forces users to rediscover what remains uniquely human:

1. forming judgment
2. taking epistemic responsibility
3. choosing what to believe, keep, reject, and argue

Yansilu must therefore treat AI as a thinking accelerator, not a thinking replacement.

### 4.2 Product interpretation

AI in Yansilu should function as a "thinking acceleration mirror".
It should reveal structure, conflict, missing evidence, and possible paths earlier than the
user might see them alone.

It must not silently produce the user's final stance, permanent-note prose, or final article.
It also must not present itself as an external omnipotent agent that "finishes the work for
you" while the user merely approves the result.

### 4.3 AI may do

AI may assist with:

1. index suggestions
2. connection suggestions
3. conflict detection and tension prompts
4. writing scaffolds
5. missing-evidence prompts
6. alternative framing suggestions

### 4.4 AI must not do

AI must not:

1. one-click generate permanent-note body text for direct saving
2. one-click generate the final draft as the default endpoint
3. silently rewrite core knowledge objects
4. automatically accept its own suggestions into the user's knowledge structure

### 4.5 Required AI-output constraints

All core AI suggestions must be:

1. Explainable
   - why was this suggestion produced
   - what input evidence triggered it
2. Rejectable
   - the user must be able to decline it without penalty
3. Traceable
   - the suggestion must point back to the notes, excerpts, or conflicts that produced it

---

## 5. Combined Product Rule

Yansilu must prevent two false completions:

1. "I copied it, therefore I understood it."
2. "AI wrote it fluently, therefore I own the thought."

This means Yansilu should protect users from both:

1. external language replacing understanding
2. AI language replacing understanding

This combined rule is a core differentiator between Yansilu and:

1. generic note-taking tools
2. clipping/highlight tools
3. AI-first writing generators

---

## 6. Operational Design Rules

### 6.1 Literature-note rules

1. Excerpt field and paraphrase field should be structurally distinct.
2. Completion state should depend on paraphrase presence, not save presence.
3. "Keep for later" is allowed.
4. "Completed understanding" must require a paraphrase or equivalent interpretation.

### 6.2 Permanent-note rules

1. Permanent notes should default toward the user's own claim language.
2. Similarity-to-source checks should run before final save.
3. The system should prefer warnings framed as epistemic prompts, not plagiarism-tool jargon.

Suggested warning style:

- This wording is still very close to the source.
- Have you translated the idea into your own judgment language yet?

### 6.3 AI-suggestion rules

1. AI suggestions must be presented as suggestions, not inserted truths.
2. Suggested links, indexes, and scaffolds should always show their basis.
3. AI should help users compare, question, and structure, rather than conclude for them.

### 6.3.1 Product-copy rules

1. Core product copy should not promise "AI writes it for you".
2. Primary calls to action should emphasize:
   - forming your own view
   - clarifying your judgment
   - organizing what you already think
3. If a workflow is AI-assisted, the UI should still frame ownership as remaining with the user.

### 6.4 Writing rules

1. Writing scaffolds may be AI-assisted.
2. Final prose ownership must remain with the user.
3. Article generation should not bypass permanent-note formation as the primary path.
4. Writing entry should start from existing notes, structures, or evidence baskets, not from
   a blank prompt that invites AI substitution.

### 6.5 Authorship-confirmation rules

1. Permanent-note save flows should include an explicit authorship-confirmation step when the
   note is created from source material, AI suggestions, or generated scaffolds.
2. That confirmation should ask, in effect:
   - is this my judgment language
   - have I rewritten this into a claim I actually stand behind
3. The system should avoid treating mere acceptance clicks as epistemic ownership.

---

## 7. Acceptance Criteria

### 7.1 Excerpt boundary acceptance

The implementation passes only if:

1. A literature note without paraphrase cannot be marked completed.
2. Literature-note UI clearly distinguishes source from paraphrase.
3. Permanent-note save flow warns or blocks when source similarity exceeds threshold.
4. The user is explicitly asked what judgment the material supports.

### 7.2 AI-boundary acceptance

The implementation passes only if:

1. AI can suggest indexes, links, conflicts, and scaffolds.
2. AI cannot directly save permanent-note body text as final truth.
3. AI suggestions are inspectable and rejectable.
4. AI-assisted writing remains traceable to notes and evidence.
5. Core UX copy does not frame AI as the product's main source of authority.

### 7.3 Regression signals

The implementation should be treated as regressing if:

1. users can complete literature-note flows with only copied text
2. permanent notes can be saved with near-source wording and no meaningful friction
3. AI can bypass permanent-note formation and jump directly to final prose by default
4. suggestions become opaque, auto-applied, or hard to refuse

---

## 8. Product Declaration

Yansilu does not help users merely save what they have read.
It helps them turn what they have read into their own understanding and judgment.

AI in Yansilu does not exist to replace that work.
It exists to make that work clearer, faster, and more structurally visible.

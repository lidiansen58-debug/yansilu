# Demo Smart Notes PM Flow

Date: 2026-05-15

## 1. Goal

Build a complete demo that shows how a product manager reads *How to Take Smart Notes*, extracts the core method in their own words, turns those ideas into permanent notes, maps them to Yansilu product decisions, and writes a product essay from those notes.

This demo is not a book summary repository. It is a worked example of Yansilu's core workflow:

```text
source material
  -> literature notes in my own words
  -> permanent notes as owned judgments
  -> index cards around product questions
  -> writing project
  -> source-grounded product essay
```

The demo should teach users how to use Yansilu by letting them inspect a finished knowledge-work path.

## 2. Copyright And Originality Boundary

The demo may refer to *How to Take Smart Notes* as a source and may capture its high-level method, but it must not reproduce book text, long passages, chapter-level paraphrase, or a substitute summary.

All demo content should be:

1. written in the product manager's own words
2. focused on reusable judgments rather than copied claims
3. explicitly connected to Yansilu product design
4. framed as a learning and product-thinking example

The product lesson should be visible: saved material is not understanding, and AI or system suggestions do not become final judgment without user confirmation.

## 3. Demo Thesis

Working title:

> From Smart Notes To Thought Distillation: Why Yansilu Is Not A Generic Notes App

Core thesis:

Yansilu should not optimize for collecting more notes. It should help users move from material to owned judgment, from owned judgment to connected themes, and from connected themes to writing.

Product manager restatement:

The value of a note-taking product is not the size of the archive. It is whether the system repeatedly helps the user answer: what do I understand, what do I believe, how does it connect, and what can I write from it?

## 4. Demo Deliverables

The current rich demo path is expected to produce:

1. one demo vault
2. one source card for the book
3. 18 to 24 literature notes
4. 2 fleeting notes that demonstrate capture is temporary and must be processed
5. about 100 permanent notes
6. 12 to 16 index cards
7. one writing project
8. one final product essay
9. one guide note explaining how to inspect the demo
10. optional AI suggestion artifacts that remain unconfirmed until the user accepts them

Recommended disposable demo vault name:

```text
demo-smart-notes-product-thinking
```

Recommended guide note:

```text
00-Read This First - From Reading To Product Judgment.md
```

Operational entry points:

```text
fixture: tests/fixtures/demo-smart-notes-product-thinking/demo.json
seed script: scripts/seed-smart-notes-product-thinking.mjs
API seed endpoint: /api/v1/demo/product-thinking/smart-notes
app entry: /prototype?demo=smart-notes-product-thinking
talk track: docs/DEMO_PLAYBOOK_SMART_NOTES_3_MIN.md
usage entry: docs/RICH_DEMO_USAGE_ENTRY.md
```

The local demo vault generated from these entries is disposable. It should be regenerated from the fixture and seed script, not treated as authored source material.

## 4.1 Core Knowledge Extraction Requirement

The demo must extract the book's method as completely as is useful for a product walkthrough. "Complete" here does not mean reproducing the book's chapters. It means covering the full conceptual system in original notes:

1. why writing should organize the note workflow
2. why collecting and understanding are different states
3. how fleeting notes, literature notes, and permanent notes differ
4. why permanent notes should be atomic, self-contained, and reusable
5. why links and relation reasons matter more than storage location
6. why structure should emerge bottom-up from the note network
7. why index cards and entry points help the user re-enter thinking
8. why regular processing beats passive accumulation
9. why the system should create feedback, surprise, and productive resistance
10. why the method is a practice and not a filing taxonomy
11. what anti-patterns make users feel productive without becoming clearer
12. how those ideas translate into Yansilu's product surfaces
13. why two example fleeting notes remain unfinished until processed into literature or permanent notes

The extraction should happen in three layers:

1. `knowledge extraction`: a concise, original statement of the method idea
2. `permanent note`: the user's owned judgment derived from that idea
3. `PM restatement`: what this means for Yansilu as a product decision

Every major demo note should include the PM restatement so users can see how raw reading becomes product thinking.

## 4.2 Fleeting Note Requirement

The demo should include exactly two visible fleeting notes. Their purpose is pedagogical: they should make it obvious that quick capture is useful but unfinished.

1. `FN-SN-001`: "Maybe note-taking apps reward collecting too much"
   - Demonstrates a rough product thought captured quickly.
   - Should have `thinkingStatus` or copy that points to the next action: turn it into a permanent note or discard it.
   - Should link forward to `PN-SN-037` and `PN-SN-038` after processing.

2. `FN-SN-002`: "Writing center should not start from a blank AI prompt"
   - Demonstrates a rough design intuition.
   - Should be processed into permanent notes around writing-first workflow and AI boundaries.
   - Should link forward to `PN-SN-001`, `PN-SN-022`, `PN-SN-023`, and `PN-SN-039`.

These fleeting notes should not look polished. They should contain short, imperfect language and a clear warning in the guide note:

```text
Fleeting notes are capture points, not knowledge. In a healthy workflow, they are regularly reviewed, converted, linked, or deleted.
```

## 5. Core Idea Matrix

Each row should become one or more permanent notes. The "PM restatement" column is the key: it translates the reading insight into Yansilu product design language.

| ID | Core idea from the method | Permanent-note judgment | PM restatement for Yansilu | Product surface |
| --- | --- | --- | --- | --- |
| SN-01 | Writing is not a final stage after thinking. It is shaped by the whole note workflow. | Writing starts long before the blank page. | Yansilu's writing center should assemble prior judgments, not ask the user to start from an empty prompt. | Writing project, writing basket |
| SN-02 | Notes should be designed around future writing. | A note is better when it can later support an argument, section, or question. | The product should treat writing readiness as a first-class quality signal. | Writing readiness, scaffold |
| SN-03 | The user needs an external thinking environment, not just memory storage. | A note system should help the user think with prior thoughts. | Yansilu should behave like a thinking workspace that returns prompts, gaps, and relations. | Related clues, graph, AI Inbox |
| SN-04 | Capturing material is only the beginning. | Saving material is not the same as understanding it. | Import and source capture must not be rewarded as completion. | Import result, literature note status |
| SN-05 | Fleeting notes are temporary reminders, not finished knowledge. | Fast capture should create an obligation to process later. | The product may support quick notes, but should keep them visibly unfinished. | Inbox, `thinkingStatus` |
| SN-06 | Literature notes require the reader to use their own words. | Rewording material reveals whether the reader understood it. | Literature notes should foreground paraphrase, not copied excerpts. | Literature note editor |
| SN-07 | Literature notes should stay close to the source while moving toward understanding. | A literature note is a bridge between external material and user judgment. | Yansilu should show source trace and user paraphrase together. | Source/literature split |
| SN-08 | Permanent notes should be useful beyond their original source. | A permanent note is an owned judgment that can travel across contexts. | Permanent notes need thesis, summary, boundary, and source traceability. | Permanent note metadata |
| SN-09 | Atomicity makes notes recombinable. | One note should carry one reusable claim. | The editor should encourage concise claims instead of long undifferentiated notes. | Permanent note form, helper hints |
| SN-10 | Permanent notes should be self-contained. | A note must be understandable when separated from today's context. | Yansilu should encourage clear titles, context, and relation reasons. | Note title, relation rationale |
| SN-11 | Notes should be written for a future reader, including the future self. | The user should not need to remember the original situation to reuse a note. | Product copy should ask the user to make notes legible to their future self. | Editor helper |
| SN-12 | Linking is part of thinking, not housekeeping. | The act of connecting a note forces the user to decide what the note means. | Relation creation should ask for relation type and rationale. | Semantic relations |
| SN-13 | Connections matter more than folder placement. | The value of a note grows through meaningful relations. | Graph features should explain why notes relate, not merely display nodes. | Graph, semantic relations |
| SN-14 | Structure should emerge bottom-up. | Premature categories can trap ideas before their real use is visible. | Yansilu should let themes emerge through index cards and relations rather than only folders. | Index cards, graph |
| SN-15 | Indexing creates re-entry points. | An index card helps the user return to a question without rereading the whole archive. | Index cards should summarize a cluster and expose the next question. | Index cards |
| SN-16 | A topic is weaker than a question. | Themes become useful when organized around a live problem. | Index cards need `central_question`, not only a title. | Index card metadata |
| SN-17 | The system should make thinking easier by making the next action obvious. | A good note system lowers friction without removing thinking. | The app should show the next thinking move, not just storage actions. | `thinkingStatus`, editor header |
| SN-18 | Productive constraints improve thinking. | The system should preserve useful resistance. | Yansilu should not auto-promote AI suggestions into final knowledge. | AI candidate status |
| SN-19 | Regular processing matters more than capture volume. | A note system fails when temporary notes pile up without transformation. | The product should surface queues and unfinished states without shaming the user. | Review queue |
| SN-20 | The slip-box creates feedback. | A good note system should answer back with related ideas, contradictions, and gaps. | Yansilu should surface gaps, tensions, and next questions from the user's own notes. | AI Inbox, related clues |
| SN-21 | Surprise is a sign that the system is working. | Unexpected connections help the user think beyond their original plan. | AI and graph suggestions should create reviewable surprises, not silent changes. | Candidate suggestions |
| SN-22 | Good writing comes from arranging already-formed ideas. | Drafting becomes easier when notes already contain judgments. | Writing scaffolds should cite the notes that support each section. | Draft scaffold |
| SN-23 | Outlines should emerge from notes, not from empty planning. | A strong outline is discovered by arranging claims and gaps. | Writing projects should be note-first, not prompt-first. | Writing project |
| SN-24 | A note archive can create false progress. | More notes can hide weaker understanding. | Metrics should prioritize confirmed judgments, linked themes, and writing readiness. | Home metrics, status badges |
| SN-25 | Collector behavior is an anti-pattern. | Accumulation feels productive while delaying judgment. | Yansilu should avoid celebrating imports, highlights, and note counts as core success. | Metrics, onboarding |
| SN-26 | Perfect taxonomy is an anti-pattern. | Over-designing categories can block the emergence of better questions. | Folders should remain practical storage, while index cards carry thinking structure. | Directory/index distinction |
| SN-27 | Fluent summaries can become an anti-pattern. | A neat summary can hide whether the user has formed a position. | AI summaries must remain candidates until the user rewrites or confirms them. | AI candidate workflow |
| SN-28 | The method is a practice, not a filing scheme. | The system succeeds only if it changes how the user thinks repeatedly. | Onboarding should demonstrate the habit loop, not only explain features. | Demo guide, onboarding |
| SN-29 | The workflow should make progress visible without making it shallow. | Progress should mean transformation toward owned judgment. | Status badges should track thinking maturity, not activity volume. | `thinkingStatus` |
| SN-30 | The final product is accountable thinking. | The user should be able to explain how a written claim grew from sources and notes. | Yansilu's demo should show provenance from source to essay section. | Final essay, scaffold |

## 6. Permanent Note Inventory

These are proposed demo permanent notes. They should be written as complete, standalone notes, each with a thesis, three-line summary, PM restatement, product implication, and relation hints.

The final demo should contain about 100 permanent notes. The list below has two layers:

1. `PN-SN-001` to `PN-SN-042`: high-detail anchor notes already listed with thesis and product angle.
2. `PN-SN-043` to `PN-SN-100`: planned expansion notes listed by cluster. These should be generated in the fixture with the same fields as the anchor notes.

Distribution target:

| Cluster | Target count | Purpose |
| --- | ---: | --- |
| Writing-first workflow | 12 | Show why writing organizes the whole system |
| Capture and fleeting notes | 8 | Show why quick capture must be processed |
| Literature notes and understanding | 12 | Show why paraphrase matters |
| Permanent-note quality | 16 | Show atomicity, self-containment, ownership, boundary |
| Relation and graph thinking | 16 | Show typed relation reasons and network feedback |
| Index cards and emergent structure | 10 | Show question-centered themes |
| Processing habits and feedback loops | 8 | Show routine, review, surprise |
| Anti-patterns and product metrics | 10 | Show false progress and shallow productivity |
| AI and authorship boundaries | 8 | Show candidate states and confirmation |

### 6.1 Writing-First System

1. `PN-SN-001`: Writing starts before drafting.
   - Thesis: A writing system should make every reading and note action usable for future composition.
   - Product angle: Yansilu's writing project should begin from selected permanent notes and index cards.

2. `PN-SN-002`: Blank-page anxiety is often a missing-preparation problem.
   - Thesis: Users struggle to write when prior notes have not been turned into reusable judgments.
   - Product angle: The app should show whether notes are ready for writing.

3. `PN-SN-003`: A writing basket is a bridge from thinking to output.
   - Thesis: A basket of confirmed judgments gives writing a concrete starting point.
   - Product angle: Writing basket should not accept every raw note as equally ready.

4. `PN-SN-004`: A draft scaffold should expose gaps instead of hiding them.
   - Thesis: A useful outline shows which claims are supported and which sections still need thinking.
   - Product angle: Scaffold sections should carry gaps, counterpoints, and source note ids.

### 6.2 Excerpt Versus Understanding

5. `PN-SN-005`: Saving material is not understanding.
   - Thesis: Captured material remains external until the user reconstructs its meaning.
   - Product angle: Import success should not imply learning success.

6. `PN-SN-006`: Paraphrase is the first test of understanding.
   - Thesis: Putting an idea into one's own words reveals confusion earlier than reviewing highlights.
   - Product angle: Literature note completion should depend on paraphrase.

7. `PN-SN-007`: Excerpts can create false completion.
   - Thesis: A beautiful saved sentence can feel like progress while leaving the user's judgment unchanged.
   - Product angle: Yansilu should reward transformation, not accumulation.

8. `PN-SN-008`: Literature notes are a transition layer.
   - Thesis: A literature note should move source material toward user meaning, not become a final archive item.
   - Product angle: Literature notes should have a visible path toward permanent notes.

### 6.3 Permanent Notes As Owned Judgments

9. `PN-SN-009`: A permanent note is a claim the user can stand behind.
   - Thesis: The permanent note should express the user's current judgment, not the source author's sentence.
   - Product angle: Confirmation semantics matter for originality and authorship.

10. `PN-SN-010`: One note should carry one reusable judgment.
    - Thesis: Atomic notes are easier to connect, challenge, reuse, and write from.
    - Product angle: The editor should encourage compression into thesis and summary.

11. `PN-SN-011`: A note needs enough context to survive separation.
    - Thesis: A permanent note should remain understandable outside the moment it was created.
    - Product angle: Notes should carry source trace, relation reasons, and clear titles.

12. `PN-SN-012`: A judgment is stronger when it names its boundary.
    - Thesis: Permanent notes should include counterpoints or limits, not only claims.
    - Product angle: `boundary_or_counterpoint` is part of thinking quality, not extra metadata.

13. `PN-SN-013`: A note becomes more valuable when it can support several future questions.
    - Thesis: Reusability is a sign that a note has been abstracted beyond one source.
    - Product angle: Related clues should surface cross-theme usefulness.

### 6.4 Connections And Graph

14. `PN-SN-014`: Relations explain meaning better than folders.
    - Thesis: Folder placement says where a note lives, but relation rationale says why it matters.
    - Product angle: Graph edges should have relation types and reasons.

15. `PN-SN-015`: Connection is not decoration.
    - Thesis: A link is useful only if it clarifies support, contrast, extension, or a gap.
    - Product angle: Yansilu graph should prioritize typed relations over visual density.

16. `PN-SN-016`: Tension creates better thinking than premature harmony.
    - Thesis: Conflicting notes should be preserved as productive tension rather than smoothed away.
    - Product angle: Relation review should include tension and conflict categories.

17. `PN-SN-017`: Missing links are writing opportunities.
    - Thesis: A gap between clusters can become a bridge note or article section.
    - Product angle: AI suggestions should help users notice bridge candidates.

### 6.5 Index Cards And Themes

18. `PN-SN-018`: Themes should emerge from questions.
    - Thesis: A useful index card is organized around a live question, not a static category.
    - Product angle: Index cards need `central_question`.

19. `PN-SN-019`: Index cards compress a cluster of judgments.
    - Thesis: A theme becomes useful when it summarizes what a group of notes is trying to say.
    - Product angle: Index card status can show whether a theme is ready for writing.

20. `PN-SN-020`: A theme is not a folder.
    - Thesis: A folder can collect notes, but an index card should create a point of view.
    - Product angle: Yansilu should keep directories and index cards conceptually separate.

21. `PN-SN-021`: Writing readiness is a property of a cluster.
    - Thesis: A single note rarely proves readiness; a supported cluster does.
    - Product angle: Writing entry should read from index cards and note baskets.

### 6.6 AI And Product Boundaries

22. `PN-SN-022`: AI suggestions must remain candidates.
    - Thesis: A system can suggest a connection or summary, but only the user can confirm it as their judgment.
    - Product angle: Candidate state transitions must forbid direct system-generated confirmation.

23. `PN-SN-023`: The product should not outsource judgment.
    - Thesis: A thinking tool loses its purpose if it makes users accept fluency as understanding.
    - Product angle: AI features should ask, compare, and reveal gaps before generating final prose.

24. `PN-SN-024`: Good friction protects authorship.
    - Thesis: Requiring confirmation before finalizing ideas slows the user down in the right place.
    - Product angle: Confirmation UI is a core product boundary, not bureaucratic overhead.

25. `PN-SN-025`: The system should reward ownership, not volume.
    - Thesis: The meaningful output of the workflow is confirmed judgment and usable writing structure.
    - Product angle: Demo metrics should emphasize transformed notes, linked claims, and scaffold readiness.

### 6.7 Full Knowledge Extraction Additions

These notes complete the method coverage beyond the first demo spine. They should be included in the fixture if the goal is a comprehensive demo rather than a lightweight walkthrough.

26. `PN-SN-026`: Fleeting notes should expire into action.
    - Thesis: A quick note is useful only if it later becomes a decision, relation, or discarded trace.
    - Product angle: Inbox notes need visible follow-up states instead of being treated as finished records.

27. `PN-SN-027`: Regular processing is the engine of the system.
    - Thesis: The note workflow depends on repeated transformation, not occasional archive cleanup.
    - Product angle: Yansilu should show review queues as thinking continuity, not chores.

28. `PN-SN-028`: Source traceability protects intellectual honesty.
    - Thesis: A user-owned judgment should still preserve the path back to the material that shaped it.
    - Product angle: Permanent notes need source ids, citation hints, and relation provenance.

29. `PN-SN-029`: Bottom-up order beats premature taxonomy.
    - Thesis: A thinking system should let structure emerge from accumulated claims and links.
    - Product angle: Directories should not carry the burden of conceptual organization.

30. `PN-SN-030`: Index cards are re-entry points into a thinking field.
    - Thesis: A good index card helps the user resume a question without re-reading everything.
    - Product angle: Index card pages should show summary, central question, active gaps, and writing readiness.

31. `PN-SN-031`: Topics become useful when they become questions.
    - Thesis: A static topic label is weaker than a question that asks the note network to respond.
    - Product angle: `central_question` should be part of theme quality.

32. `PN-SN-032`: The system should produce useful surprise.
    - Thesis: The note network becomes valuable when it reveals relations the user did not plan in advance.
    - Product angle: AI suggestions and graph clues should surface unexpected but reviewable links.

33. `PN-SN-033`: Relation reasons are more important than relation counts.
    - Thesis: A link without a reason adds noise more easily than insight.
    - Product angle: Yansilu should ask why two notes relate before treating the relation as knowledge.

34. `PN-SN-034`: Contradiction should remain visible.
    - Thesis: Tension between notes is a resource for thinking and writing, not a defect to hide.
    - Product angle: Relation types should include contrast, tension, and unresolved gap.

35. `PN-SN-035`: A scaffold is a thinking diagnostic.
    - Thesis: An outline should show support, gaps, and counterpoints instead of only giving a clean structure.
    - Product angle: Draft scaffolds should expose weak sections and missing evidence.

36. `PN-SN-036`: Writing should arrange judgments, not paste excerpts.
    - Thesis: A source-grounded essay should be built from user-owned claims with traceable support.
    - Product angle: The writing project should privilege permanent notes over raw source excerpts.

37. `PN-SN-037`: Note count is a misleading progress metric.
    - Thesis: A larger archive can hide a weaker thinking process.
    - Product angle: Product metrics should emphasize transformed, connected, and writing-ready notes.

38. `PN-SN-038`: Import success is not learning success.
    - Thesis: Moving files into a vault says nothing about whether the user has understood them.
    - Product angle: Import completion should hand off into review, paraphrase, and distillation.

39. `PN-SN-039`: AI fluency can imitate understanding.
    - Thesis: Smooth generated language can make unfinished thinking look finished.
    - Product angle: AI outputs should stay in candidate states until user revision or confirmation.

40. `PN-SN-040`: Useful friction protects the user's authorship.
    - Thesis: Some confirmation steps are necessary because they make responsibility explicit.
    - Product angle: Confirmation is part of the thinking workflow, not just a compliance step.

41. `PN-SN-041`: The method is learned through a visible loop.
    - Thesis: Users understand the system by seeing capture, paraphrase, judgment, relation, and writing as one loop.
    - Product angle: The demo should teach through a complete worked example rather than feature explanation.

42. `PN-SN-042`: The final artifact should reveal its reasoning path.
    - Thesis: A good product essay should make its source-to-judgment path inspectable.
    - Product angle: The demo final essay should link back to supporting permanent notes and index cards.

### 6.8 Expansion Notes To Reach About 100 Permanent Notes

These notes should be implemented in the fixture with the same schema as the anchor notes. They can be shorter than the anchor notes in the planning document, but the seeded demo should still include thesis, three-line summary, PM restatement, product implication, and relation hints.

#### Writing-First Workflow

43. `PN-SN-043`: Writing goals change how reading is evaluated.
44. `PN-SN-044`: A reading note is stronger when it names a possible future use.
45. `PN-SN-045`: A blank prompt hides the work that writing actually needs.
46. `PN-SN-046`: A writing project should begin by selecting claims, not asking for prose.
47. `PN-SN-047`: A draft section is only as strong as the notes that support it.
48. `PN-SN-048`: Writing from notes makes revision more concrete.
49. `PN-SN-049`: The best writing workflow preserves uncertainty until the user resolves it.
50. `PN-SN-050`: A reusable judgment can serve multiple articles.

#### Capture And Fleeting Notes

51. `PN-SN-051`: Fast capture should be intentionally low-friction and low-status.
52. `PN-SN-052`: A fleeting note should not be optimized for long-term storage.
53. `PN-SN-053`: Unprocessed quick notes are a hidden debt.
54. `PN-SN-054`: A capture inbox needs a review rhythm.
55. `PN-SN-055`: Deleting a weak fleeting note is also progress.
56. `PN-SN-056`: Quick thoughts become useful when converted into claims or questions.
57. `PN-SN-057`: The product should separate "captured" from "processed".
58. `PN-SN-058`: Fleeting notes should point to the next thinking action.

#### Literature Notes And Understanding

59. `PN-SN-059`: A literature note should preserve what the source contributed to the user's thinking.
60. `PN-SN-060`: A paraphrase is weak if it merely changes wording without changing ownership.
61. `PN-SN-061`: A good literature note names why the material matters.
62. `PN-SN-062`: Source closeness should be visible so the user can avoid accidental copying.
63. `PN-SN-063`: Literature notes should invite conversion, not endless accumulation.
64. `PN-SN-064`: Understanding improves when the user states the source's implication in their own project.
65. `PN-SN-065`: Reading notes should not erase uncertainty.
66. `PN-SN-066`: A literature note can contain a question even before it contains a claim.

#### Permanent-Note Quality

67. `PN-SN-067`: A permanent note needs a title that carries a claim.
68. `PN-SN-068`: A permanent note should explain its own relevance.
69. `PN-SN-069`: A permanent note should be concise enough to be moved.
70. `PN-SN-070`: A permanent note should be rich enough to be reused.
71. `PN-SN-071`: A permanent note should distinguish evidence from interpretation.
72. `PN-SN-072`: A permanent note should record why the user accepts the claim for now.
73. `PN-SN-073`: A permanent note can be provisional without being vague.
74. `PN-SN-074`: A permanent note should expose its weakest assumption.
75. `PN-SN-075`: A mature note is easier to challenge.
76. `PN-SN-076`: A note becomes more useful when its relation to writing is explicit.

#### Relation And Graph Thinking

77. `PN-SN-077`: A support relation should say what kind of support is being offered.
78. `PN-SN-078`: A contrast relation prevents the archive from becoming one-sided.
79. `PN-SN-079`: A tension relation is a prompt for future thinking.
80. `PN-SN-080`: A bridge relation can create an article section.
81. `PN-SN-081`: A duplicate relation should trigger consolidation, not shame.
82. `PN-SN-082`: A source-gap relation protects claims from floating away from evidence.
83. `PN-SN-083`: A sequence relation helps turn notes into arguments.
84. `PN-SN-084`: A relation without a reason should remain a candidate.
85. `PN-SN-085`: Dense graphs need filters that serve questions.
86. `PN-SN-086`: The graph should help the user choose the next note to work on.

#### Index Cards And Emergent Structure

87. `PN-SN-087`: Index cards turn clusters into navigable thinking surfaces.
88. `PN-SN-088`: An index card should name what is still unresolved.
89. `PN-SN-089`: A good index card can become the seed of an essay.
90. `PN-SN-090`: Index cards should group notes by argumentative role, not only subject.
91. `PN-SN-091`: A theme is mature when it contains support, tension, and open questions.
92. `PN-SN-092`: Index cards make bottom-up order visible.

#### Habits, Anti-Patterns, AI, And Product Metrics

93. `PN-SN-093`: Review cadence matters more than capture enthusiasm.
94. `PN-SN-094`: Productivity theater appears when the system rewards visible activity over clearer thinking.
95. `PN-SN-095`: The product should make shallow progress feel incomplete.
96. `PN-SN-096`: AI can help find relations the user should inspect.
97. `PN-SN-097`: AI should ask for confirmation where authorship changes.
98. `PN-SN-098`: A suggested summary should become a draft, not a final note.
99. `PN-SN-099`: The product manager's job is to design for epistemic responsibility.
100. `PN-SN-100`: The demo should leave the user with a repeatable practice, not just admiration for a finished example.

## 7. Literature Notes

Literature notes should be short, clearly paraphrased, and visibly transitional. They should not become a substitute book summary.

Recommended set:

1. `LN-SN-001`: The note workflow treats writing as a continuous practice.
2. `LN-SN-002`: Brief capture notes are temporary and should be processed.
3. `LN-SN-003`: Reading notes should be written in the reader's own words.
4. `LN-SN-004`: Main notes should be understandable beyond their original source.
5. `LN-SN-005`: Notes gain power when they are connected to other notes.
6. `LN-SN-006`: Organizing by topic alone can hide the logic of ideas.
7. `LN-SN-007`: The slip-box works because it creates repeated feedback.
8. `LN-SN-008`: Writing becomes easier when the system already contains developed claims.
9. `LN-SN-009`: The method requires regular processing, not passive collection.
10. `LN-SN-010`: The system's value comes from practice, not from the container.
11. `LN-SN-011`: The archive should invite comparison and contradiction.
12. `LN-SN-012`: Good notes make future work easier by preserving the reasoning path.
13. `LN-SN-013`: A quick capture note should be treated as an unfinished prompt to think later.
14. `LN-SN-014`: Literature notes preserve the user's encounter with a source without becoming the final thought.
15. `LN-SN-015`: Permanent notes are written for reuse across future contexts.
16. `LN-SN-016`: A note network becomes more useful when links carry reasons.
17. `LN-SN-017`: Indexes and entry points help users re-enter complex thinking without restarting.
18. `LN-SN-018`: The system discourages rigid upfront taxonomy in favor of emerging structure.
19. `LN-SN-019`: Good note practice creates small, repeated decisions rather than a single large organization task.
20. `LN-SN-020`: The final written work should be assembled from developed thoughts, not copied source fragments.
21. `LN-SN-021`: The method can create surprise because old notes meet new questions.
22. `LN-SN-022`: False progress appears when collection replaces transformation.
23. `LN-SN-023`: The system should make the next thinking step easier to see.
24. `LN-SN-024`: The note workflow is successful when the user can explain how a claim developed.

Each literature note should contain:

```yaml
type: literature
source_id: SRC-SMART-NOTES
paraphrase_text: ...
my_takeaway: ...
candidate_permanent_notes:
  - PN-SN-...
```

## 8. Index Cards

The demo should include index cards that organize permanent notes around product questions.

1. `IC-SN-001`: Why note-taking should start from future writing
   - Central question: Why does a writing-oriented note system produce better notes than a storage-oriented one?
   - Notes: `PN-SN-001`, `PN-SN-002`, `PN-SN-003`, `PN-SN-004`

2. `IC-SN-002`: Why excerpting is not understanding
   - Central question: How should the product prevent users from mistaking capture for comprehension?
   - Notes: `PN-SN-005`, `PN-SN-006`, `PN-SN-007`, `PN-SN-008`

3. `IC-SN-003`: What makes a permanent note product-ready
   - Central question: What fields and interactions help a note become an owned judgment?
   - Notes: `PN-SN-009`, `PN-SN-010`, `PN-SN-011`, `PN-SN-012`, `PN-SN-013`

4. `IC-SN-004`: Why graph relations need meaning
   - Central question: How can a graph help thinking instead of becoming visual decoration?
   - Notes: `PN-SN-014`, `PN-SN-015`, `PN-SN-016`, `PN-SN-017`

5. `IC-SN-005`: Why themes are question-centered
   - Central question: How should index cards differ from folders?
   - Notes: `PN-SN-018`, `PN-SN-019`, `PN-SN-020`, `PN-SN-021`

6. `IC-SN-006`: How AI can help without taking over authorship
   - Central question: Where should Yansilu draw the line between assistance and substitution?
   - Notes: `PN-SN-022`, `PN-SN-023`, `PN-SN-024`, `PN-SN-025`

7. `IC-SN-007`: How a daily processing loop keeps the system alive
   - Central question: Why does regular transformation matter more than occasional organization?
   - Notes: `PN-SN-026`, `PN-SN-027`, `PN-SN-038`, `PN-SN-041`

8. `IC-SN-008`: What product metrics should reward
   - Central question: Which signals prove that material is becoming user-owned judgment?
   - Notes: `PN-SN-024`, `PN-SN-025`, `PN-SN-037`, `PN-SN-040`

9. `IC-SN-009`: How the final essay preserves provenance
   - Central question: How can a written result show the path from source to judgment?
   - Notes: `PN-SN-028`, `PN-SN-035`, `PN-SN-036`, `PN-SN-042`

## 9. Relation Map

The relation graph should be rich enough to demonstrate how Yansilu manages thinking structure. With about 100 permanent notes, the demo should include around 140 to 180 relations. The graph should not be complete or mechanically dense; it should be intentionally meaningful.

Required relation types:

1. `supports`
2. `extends`
3. `contrasts`
4. `tension`
5. `gap`
6. `leads_to`
7. `evidence_for`
8. `example_of`
9. `counterexample_to`
10. `depends_on`
11. `duplicates_or_overlaps`
12. `refines`
13. `source_gap`
14. `writing_move`

Relation coverage targets:

| Relation type | Target count | Demo purpose |
| --- | ---: | --- |
| `supports` | 25 to 35 | Show how claims reinforce each other |
| `extends` | 15 to 25 | Show idea growth across notes |
| `contrasts` | 10 to 18 | Show that the archive preserves disagreement |
| `tension` | 8 to 14 | Show unresolved thinking opportunities |
| `gap` | 8 to 14 | Show what still needs evidence, examples, or clarification |
| `leads_to` | 15 to 25 | Show workflow progression from capture to writing |
| `evidence_for` | 10 to 18 | Show source-grounded support |
| `example_of` | 8 to 12 | Show concrete cases under abstract claims |
| `counterexample_to` | 4 to 8 | Show boundary thinking |
| `depends_on` | 6 to 10 | Show prerequisite relationships |
| `duplicates_or_overlaps` | 3 to 6 | Show consolidation opportunities |
| `refines` | 8 to 14 | Show how rough thoughts become sharper notes |
| `source_gap` | 4 to 8 | Show claims needing stronger grounding |
| `writing_move` | 10 to 16 | Show notes feeding essay sections |

Graph design requirements:

1. Every permanent note should have at least one relation.
2. Anchor notes `PN-SN-001` to `PN-SN-042` should average at least three relations.
3. Each index card cluster should include support, extension, and at least one gap or tension.
4. The two fleeting notes should have `leads_to` or `refines` relations into processed permanent notes.
5. At least 15 relations should cross cluster boundaries.
6. At least 10 relations should point into the writing project as `writing_move`.
7. AI-created relations, if included, must use candidate status and should not be pre-confirmed.
8. Relation rationale text is required; no relation should exist only as a bare edge.

Example relations:

| From | Type | To | Rationale |
| --- | --- | --- | --- |
| `FN-SN-001` | refines | `PN-SN-037` | The rough concern about over-collection becomes a sharper claim about note count as a misleading metric. |
| `FN-SN-002` | refines | `PN-SN-045` | The quick design intuition becomes a product claim about blank prompts hiding the real work of writing. |
| `PN-SN-005` | supports | `PN-SN-006` | If saving material is not understanding, paraphrase becomes the first operational test. |
| `PN-SN-006` | leads_to | `PN-SN-009` | Paraphrase prepares the user to form an owned permanent-note judgment. |
| `PN-SN-010` | supports | `PN-SN-014` | Atomic notes make meaningful relation building easier. |
| `PN-SN-014` | contrasts | `PN-SN-020` | Relation rationale and folder placement solve different problems. |
| `PN-SN-016` | extends | `PN-SN-024` | Preserving tension is one reason useful friction matters. |
| `PN-SN-022` | supports | `PN-SN-023` | Candidate-only AI behavior protects the user's responsibility for judgment. |
| `PN-SN-017` | leads_to | `PN-SN-004` | Bridge gaps can become scaffold sections. |
| `PN-SN-018` | supports | `PN-SN-019` | A central question gives index-card compression a direction. |
| `PN-SN-025` | contrasts | `PN-SN-007` | Ownership metrics resist the false progress of accumulation. |
| `PN-SN-032` | example_of | `PN-SN-020` | Surprise from the note network is one way the system answers back. |
| `PN-SN-034` | tension | `PN-SN-091` | A mature theme should hold tension instead of only collecting agreement. |
| `PN-SN-062` | source_gap | `PN-SN-036` | Writing from user-owned claims still needs visible source grounding. |
| `PN-SN-084` | depends_on | `PN-SN-033` | A candidate relation needs a reason before it becomes trustworthy. |
| `PN-SN-098` | contrasts | `PN-SN-009` | A suggested summary is not yet the user's owned judgment. |
| `PN-SN-100` | writing_move | `WP-SN-PM-001` | The final essay should close by turning the demo into a repeatable user practice. |

## 10. Writing Project

Writing project id:

```text
WP-SN-PM-001
```

Title:

```text
Why Yansilu Is Not A Generic Notes App
```

Writing intent:

Explain, from a product manager's perspective, why Yansilu separates source capture, literature notes, permanent notes, index cards, and writing projects.

Target reader:

A user who has tried note-taking apps, saved many highlights, and still struggles to turn reading into writing.

Reader takeaway:

The user should understand that Yansilu is designed to help them form and connect their own judgments, not simply store more information or ask AI to write for them.

Recommended basket:

```text
PN-SN-001
PN-SN-005
PN-SN-006
PN-SN-009
PN-SN-014
PN-SN-018
PN-SN-022
PN-SN-025
```

## 11. Final Essay Outline

Working title:

```text
Why Yansilu Is Not A Generic Notes App
```

Outline:

1. The common failure: users save many notes but still face a blank page.
2. A writing-oriented note system treats every reading action as future writing preparation.
3. Captured material must pass through paraphrase before it becomes user understanding.
4. Permanent notes are owned judgments, not copied fragments.
5. Index cards organize questions and themes that emerge from those judgments.
6. Graph relations matter only when they explain support, contrast, tension, or gaps.
7. AI should suggest, question, and reveal possibilities, but not confirm knowledge for the user.
8. Yansilu's design goal is to turn material into accountable judgment and judgment into writing.

Expected final output length:

```text
1200 to 1800 Chinese characters
```

The final essay should explicitly mention Yansilu features, but it should read as a product essay rather than a feature list.

## 12. Demo User Journey

The guide note should invite the user to inspect the demo in this order:

1. Open the source card.
2. Open two literature notes and compare source takeaway versus paraphrase.
3. Open the permanent note `PN-SN-005` and inspect thesis, summary, PM restatement, and product implication.
4. Open the relation graph around `PN-SN-005`.
5. Open `IC-SN-002` to see how a question groups several judgments.
6. Open the writing project and inspect the basket.
7. Open the draft scaffold and see which permanent notes support each section.
8. Read the final essay.
9. Inspect optional AI suggestions and notice they are not confirmed by default.

## 13. Runbook And Data Boundaries

### 13.1 Source Asset

The checked-in source asset is:

```text
tests/fixtures/demo-smart-notes-product-thinking/demo.json
```

It should contain the demo's canonical data shape:

1. sources
2. 18 to 24 literature notes
3. exactly 2 fleeting notes
4. about 100 permanent notes
5. 12 to 16 index cards
6. 140 to 180 relations across the required relation types
7. writing project
8. scaffold
9. final essay note
10. guide note

Do not hand-edit generated markdown or local database output and then treat it as the source of truth. Candidate content changes should go through the JSON fixture in a dedicated fixture task, not through this playbook update.

### 13.2 Local Seed Entry

Seed into a disposable local vault:

```powershell
$env:DEMO_VAULT="E:\Projects\Thinking in Notes\.local-demo-vaults\smart-notes-product-thinking"
node scripts/seed-smart-notes-product-thinking.mjs --vault $env:DEMO_VAULT
```

Expected seed behavior:

1. accepts `--vault <path>`
2. initializes the vault structure if needed
3. writes notes with deterministic ids and filenames
4. writes relations and index-card metadata through existing domain helpers where possible
5. can be run repeatedly against the demo vault without duplicating notes, relations, index cards, or writing projects

The vault under `.local-demo-vaults` is generated runtime output. It may be deleted before a recording, reseeded after an exploratory demo, and must not be committed.

Do not seed this demo into:

1. `vault-example`
2. a tracked example vault
3. a normal development vault with unrelated notes
4. `.yansilu` runtime state intended for another workflow

### 13.3 App Entry

The interactive app entry is:

```text
/prototype?demo=smart-notes-product-thinking
```

The route calls the public demo seed endpoint and opens the seeded workspace.

For a complete walkthrough, open the story page first and the app entry second:

```text
/demo/zettelkasten
/prototype?demo=smart-notes-product-thinking
```

The story page frames the product narrative. The prototype demonstrates the seeded workspace: source card, literature notes, permanent notes, graph relations, index cards, writing project, scaffold, and essay.

### 13.4 Recommended Demo Sequence

Use the demo in this order:

1. State the originality boundary: original paraphrases and PM restatements only, not copied book text or a replacement summary.
2. State the data boundary: the local vault is disposable/generated and can be regenerated from the seed path.
3. Open the source card and guide note.
4. Open two fleeting notes to show unfinished capture.
5. Open two literature notes to show source trace plus user paraphrase.
6. Open representative permanent notes such as `PN-SN-001`, `PN-SN-005`, `PN-SN-037`, `PN-SN-065`, and `PN-SN-100`.
7. Switch to graph and explain relation type plus rationale, not visual density.
8. Open `IC-SN-002` or `IC-SN-005` to show question-centered organization.
9. Open `WP-SN-PM-001` and `DS-SN-PM-001` to show writing from selected judgments.
10. End with the final essay as traceable product thinking, not AI-authored output.

### 13.5 Validation

Validation should prove:

1. all demo notes can be listed
2. exactly two fleeting notes exist and both point to processing actions
3. all permanent notes have thesis and PM restatement
4. relation targets exist
5. all required relation types appear at least once
6. every permanent note has at least one relation
7. index cards reference existing notes
8. writing project references existing permanent notes
9. final essay exists and can be opened
10. guide note exists and explains how to inspect the demo

Focused validation commands are listed in `docs/RICH_DEMO_USAGE_ENTRY.md`. This document stays at the product-flow and demo-runbook level.

## 14. Acceptance Criteria

The demo is successful when:

1. A new user can understand the difference between source, literature note, permanent note, index card, and writing project in five minutes.
2. The user can see why Yansilu treats paraphrase and confirmation as product boundaries.
3. The relation graph communicates thinking structure rather than just visual density.
4. The writing project clearly grows from confirmed notes.
5. AI suggestions, if present, remain candidates until the user accepts them.
6. The demo does not reproduce copyrighted book text or function as a replacement for the book.
7. The final essay explains Yansilu's design using the user's own product-manager perspective.

## 15. Documentation Maintenance Notes

This document should explain the demo's product logic and operating boundaries. Keep implementation edits out of this file unless they change how a presenter prepares or tells the demo.

For documentation-only updates:

1. Keep changes limited to `docs/`.
2. Do not edit `tests/fixtures`, `scripts`, `vault-example`, `.yansilu`, or package files.
3. Preserve the copyright boundary: no copied book text, no long passages, no chapter-level substitute summary.
4. Preserve the authorship boundary: AI or system suggestions remain candidates until a user accepts or rewrites them.
5. Preserve the data boundary: local demo vaults are disposable/generated outputs.

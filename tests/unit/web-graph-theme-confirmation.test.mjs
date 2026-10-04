import test from "node:test";
import assert from "node:assert/strict";
import { renderGraphThemeConfirmation } from "../../apps/web/src/graph-theme-confirmation-dialog.js";
import { buildGraphThemeConfirmedPayload } from "../../apps/web/src/graph-theme-confirmed-payload.js";

const notes = new Map([
  ["a", { id: "a", title: "观点 A", thesis: "实际判断 A" }],
  ["b", { id: "b", title: "观点 B", thesis: "实际判断 B" }],
  ["c", { id: "c", title: "观点 C" }]
]);

test("theme confirmation shows actual notes, editable membership and an empty required question", () => {
  const html = renderGraphThemeConfirmation({ notes: [...notes.values()].map(note => ({ ...note, title: `${note.title}<script>bad</script>` })) });
  assert.match(html, /实际判断 A/);
  assert.equal((html.match(/name="noteId"/g) || []).length, 3);
  assert.match(html, /name="question" rows="2" required><\/textarea>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("confirmed theme preserves the user's question and real internal relations, never invented roles", () => {
  const payload = buildGraphThemeConfirmedPayload({ directoryId: "dir", noteById: id => notes.get(id),
    confirmation: { title: "我的主题", centralQuestion: "这个判断何时成立？", noteIds: ["a", "b", "c"], roles: { c: "作为反例待核查" } },
    edges: [
      { id: "body", fromNoteId: "a", toNoteId: "b", relationType: "associated_with", rationale: "markdown_wikilink" },
      { id: "manual", fromNoteId: "b", toNoteId: "a", relationType: "qualifies", rationale: "限定在条件 X" },
      { fromNoteId: "a", toNoteId: "outside", rationale: "不属于这个主题" },
      { fromNoteId: "a", toNoteId: "c", status: "dismissed", rationale: "已忽略" }
    ]
  });
  assert.equal(payload.centralQuestion, "这个判断何时成立？");
  assert.match(payload.threeLineSummary[1], /组内已有 2 条关系/);
  assert.match(payload.items[0].rationale, /观点 A → 相关 → 观点 B/);
  assert.match(payload.items[1].rationale, /限定在条件 X/);
  assert.equal(payload.items[2].rationale, "作为反例待核查");
  assert.doesNotMatch(JSON.stringify(payload), /关键判断|不属于这个主题|已忽略|markdown_wikilink/);
});

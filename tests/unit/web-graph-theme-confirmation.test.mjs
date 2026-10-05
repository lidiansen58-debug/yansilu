import test from "node:test";
import assert from "node:assert/strict";
import { createGraphThemeConfirmationDialog, renderGraphThemeConfirmation } from "../../apps/web/src/graph-theme-confirmation-dialog.js";
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

test("failed theme confirmation restores fields and exact membership with escaped error text", () => {
  const html = renderGraphThemeConfirmation({ notes: [...notes.values()],
    draft: { centralQuestion: '问题 <Q>', title: '名称 "T"', noteIds: ["a", "c"], roles: { a: '用途 <A>', b: "未选笔记的用途" } },
    saveError: "保存失败：<503>"
  });
  assert.match(html, /required>问题 &lt;Q&gt;<\/textarea>/);
  assert.match(html, /name="title" value="名称 &quot;T&quot;"/);
  assert.match(html, /name="role:a" value="用途 &lt;A&gt;"/);
  assert.match(html, /name="role:b" value="未选笔记的用途"/);
  assert.match(html, /name="noteId" value="a" checked/);
  assert.match(html, /name="noteId" value="c" checked/);
  assert.doesNotMatch(html, /name="noteId" value="b" checked/);
  assert.match(html, /<details open>/);
  assert.match(html, /data-graph-theme-confirmation-error>保存失败：&lt;503&gt;/);
});

test("dialog submission retains a blank optional name and roles for unchecked notes", async () => {
  const handlers = {};
  const form = { elements: {
    question: { value: "我的问题？" }, title: { value: "" },
    namedItem: key => ({ value: key === "role:d" ? "暂不选择的用途" : "支持材料" })
  }, querySelectorAll: () => ["a", "b", "c"].map(value => ({ value })),
    addEventListener: (name, handler) => { handlers[name] = handler; } };
  let removed = false;
  const root = { setAttribute() {}, addEventListener() {}, remove() { removed = true; },
    querySelector: selector => selector === "form" ? form : { addEventListener() {}, focus() {} } };
  const request = createGraphThemeConfirmationDialog({ documentRef: {
    body: { appendChild() {} }, createElement: () => root, activeElement: null
  } });
  const result = request({ notes: ["a", "b", "c", "d"].map(id => ({ id, title: id })) });
  handlers.submit({ preventDefault() {}, currentTarget: form });
  const draft = await result;
  assert.equal(removed, true);
  assert.equal(draft.title, "");
  assert.deepEqual(draft.noteIds, ["a", "b", "c"]);
  assert.equal(draft.roles.d, "暂不选择的用途");
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

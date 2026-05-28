import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function extractFunctionSource(source, name) {
  const signature = `function ${name}(`;
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `expected ${name}() to exist`);
  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart >= 0, `expected ${name}() body to exist`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract ${name}() source`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

test("AI canonical debug panel renders suggestion snapshots alongside inbox snapshots", () => {
  const currentFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(currentFile), "../..");
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const fnSource = extractFunctionSource(source, "renderAiCanonicalDebugPanel");

  const panel = { innerHTML: "" };
  const renderAiCanonicalDebugPanel = new Function(
    "$",
    "settingsState",
    "escapeHtml",
    `${fnSource}; return renderAiCanonicalDebugPanel;`
  )(
    (id) => (id === "settingsAiCanonicalDebug" ? panel : null),
    {
      ai: {
        debugSnapshots: {
          inboxList: null,
          inboxDetail: null,
          inboxDecision: null,
          suggestionsList: {
            capturedAt: "2026-05-20T12:00:00.000Z",
            runtime: { items: [{ id: "suggestion_1", status: "suggested" }] },
            canonical: { items: [{ id: "suggestion_1", status: "suggested" }] }
          },
          suggestionDetail: {
            capturedAt: "2026-05-20T12:01:00.000Z",
            runtime: { item: { id: "suggestion_1", status: "edited" } },
            canonical: { item: { id: "suggestion_1", status: "edited" } }
          },
          suggestionDecision: {
            capturedAt: "2026-05-20T12:02:00.000Z",
            runtime: { item: { id: "suggestion_1", status: "confirmed" } },
            canonical: { item: { id: "suggestion_1", status: "confirmed" } }
          },
          scheduledTasksList: null,
          scheduledTaskAction: null
        }
      }
    },
    escapeHtml
  );

  renderAiCanonicalDebugPanel();

assert.match(panel.innerHTML, /AI 建议列表/);
assert.match(panel.innerHTML, /AI 建议详情/);
assert.match(panel.innerHTML, /AI 建议决策/);
  assert.match(panel.innerHTML, /suggestion_1/);
  assert.match(panel.innerHTML, /confirmed/);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAuthorshipItem,
  normalizeThinkingStatusItem,
  renderThinkingStatusBadge,
  thinkingStatusTone,
  uniqueStrings
} from "../../apps/web/src/prototype-thinking-status.js";

test("prototype thinking status helper normalizes authorship and status payloads", () => {
  assert.deepEqual(normalizeAuthorshipItem({ user_confirmed: 1, ai_assisted: "" }), {
    user_confirmed: true,
    ai_assisted: false
  });
  assert.equal(normalizeAuthorshipItem(null), null);
  assert.deepEqual(normalizeThinkingStatusItem({
    status: "ready_note",
    label: " Ready ",
    nextAction: " Next ",
    severity: ""
  }), {
    status: "ready_note",
    label: "Ready",
    nextAction: "Next",
    targetField: "",
    severity: "next"
  });
  assert.equal(normalizeThinkingStatusItem({}), null);
});

test("prototype thinking status helper computes tone and renders escaped badge", () => {
  assert.equal(thinkingStatusTone({ severity: "ready" }), "ready");
  assert.equal(thinkingStatusTone({ status: "ready_note" }), "ready");
  assert.equal(thinkingStatusTone({ severity: "next" }), "next");

  const html = renderThinkingStatusBadge({
    label: "<Ready>",
    nextAction: "Check",
    severity: "ready"
  }, {
    className: "badge",
    escapeHtml: (value) => String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  });
  assert.match(html, /class="badge"/);
  assert.match(html, /data-tone="ready"/);
  assert.match(html, /&lt;Ready&gt;/);
});

test("prototype thinking status helper dedupes and trims strings", () => {
  assert.deepEqual(uniqueStrings([" a ", "a", "", null, "b"]), ["a", "b"]);
});

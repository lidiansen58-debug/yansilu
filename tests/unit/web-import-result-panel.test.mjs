import test from "node:test";
import assert from "node:assert/strict";
import { renderImportResultPanel } from "../../apps/web/src/import-result-panel.js";

test("import result panel renders metrics warnings actions and raw json", () => {
  const html = renderImportResultPanel({
    data: { stage: "preview" },
    title: "导入预览完成",
    subtitle: "imp_1",
    tone: "warn",
    statusLabel: "需注意",
    metrics: [{ label: "导入记录", value: "imp_1" }],
    warnings: [{ code: "IMPORT_EMPTY_PAYLOAD", message: "payload missing" }],
    actions: ["补充 Payload JSON"],
    writingActionsHtml: '<div class="writing-actions">x</div>',
    skipBreakdownHtml: '<div class="skip-breakdown">y</div>',
    candidatePreviewHtml: '<div class="result-candidates">z</div>',
    writingDetailsHtml: '<div class="writing-preview">w</div>',
    raw: '{"stage":"preview"}'
  });

  assert.match(html, /result-card/);
  assert.match(html, /导入预览完成/);
  assert.match(html, /需注意/);
  assert.match(html, /需要注意/);
  assert.match(html, /IMPORT_EMPTY_PAYLOAD/);
  assert.match(html, /补充 Payload JSON/);
  assert.match(html, /result-candidates/);
  assert.match(html, /原始 JSON/);
  assert.match(html, /&quot;stage&quot;:&quot;preview&quot;/);
});

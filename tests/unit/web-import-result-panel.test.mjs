import test from "node:test";
import assert from "node:assert/strict";
import { renderImportResultPanel } from "../../apps/web/src/import-result-panel.js";

test("import result panel renders redesigned summary, warnings, actions, and folded details", () => {
  const html = renderImportResultPanel({
    data: { stage: "preview" },
    title: "导入预览已生成",
    subtitle: "imp_1",
    brief: "检查候选内容，确认后再导入。",
    tone: "warn",
    statusLabel: "注意",
    metrics: [{ label: "来源", value: "Obsidian 仓库" }],
    warnings: [{ code: "IMPORT_EMPTY_PAYLOAD", message: "payload missing" }],
    actions: ["补充导入路径或 Payload。"],
    writingActionsHtml: '<div class="writing-actions">x</div>',
    skipBreakdownHtml: '<div class="skip-breakdown">y</div>',
    candidatePreviewHtml: '<div class="result-candidates">z</div>',
    writingDetailsHtml: '<div class="writing-preview">w</div>',
    raw: '{"stage":"preview"}'
  });

  assert.match(html, /result-card/);
  assert.match(html, /导入预览已生成/);
  assert.match(html, /注意/);
  assert.match(html, /检查候选内容，确认后再导入/);
  assert.match(html, /result-brief warn/);
  assert.match(html, /需要处理/);
  assert.match(html, /payload missing/);
  assert.match(html, /补充导入路径或 Payload/);
  assert.match(html, /候选详情/);
  assert.match(html, /跳过与保留/);
  assert.match(html, /写作后续/);
  assert.match(html, /原始数据/);
  assert.match(html, /result-detail-body/);
  assert.match(html, /result-candidates/);
  assert.match(html, /&quot;stage&quot;:&quot;preview&quot;/);
});

test("import result panel renders created files summary with assets", () => {
  const html = renderImportResultPanel({
    data: {
      stage: "confirm",
      result: {
        createdFiles: [
          { noteId: "src_1", noteType: "source", path: "notes/sources/src_1.md" },
          { noteId: "asset_1", noteType: "asset", path: "assets/imports/imp_1/chart.png" }
        ]
      }
    },
    title: "导入完成",
    statusLabel: "完成",
    raw: "{}"
  });

  assert.match(html, /result-file-inventory/);
  assert.match(html, /本次写入/);
  assert.match(html, /来源 1/);
  assert.match(html, /资源 1/);
});

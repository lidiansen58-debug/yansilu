import test from "node:test";
import assert from "node:assert/strict";
import { renderImportResultPanel } from "../../apps/web/src/import-result-panel.js";

test("import result panel renders localized zero-candidate preview feedback", () => {
  const html = renderImportResultPanel({
    data: { stage: "preview" },
    title: "导入预览已生成",
    subtitle: "imp_1",
    brief: "当前没有可确认导入的候选，请先处理警告里的文件问题。",
    tone: "warn",
    statusLabel: "注意",
    metrics: [{ label: "来源", value: "Obsidian 仓库" }],
    warnings: [
      {
        code: "IMPORT_MARKDOWN_ENCODING_UNSUPPORTED",
        message: "有笔记编码异常，已被跳过以避免乱码导入。",
        detail: "Markdown file is not valid UTF-8 and could not be safely decoded as GB18030."
      }
    ],
    actions: ["把源文件转成 UTF-8，或修正异常编码后重新预览。"],
    writingActionsHtml: '<div class="writing-actions">x</div>',
    skipBreakdownHtml: '<div class="skip-breakdown">y</div>',
    candidatePreviewHtml: '<div class="result-candidates">z</div>',
    writingDetailsHtml: '<div class="writing-preview">w</div>',
    raw: '{"stage":"preview"}'
  });

  assert.match(html, /result-card/);
  assert.match(html, /导入预览已生成/);
  assert.match(html, /注意/);
  assert.match(html, /当前没有可确认导入的候选，请先处理警告里的文件问题/);
  assert.match(html, /result-brief warn/);
  assert.match(html, /需要处理/);
  assert.match(html, /有笔记编码异常，已被跳过以避免乱码导入/);
  assert.match(html, /详情：Markdown file is not valid UTF-8/);
  assert.match(html, /把源文件转成 UTF-8，或修正异常编码后重新预览/);
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

test("import result panel renders organizing home after permanent-note import", () => {
  const html = renderImportResultPanel({
    data: {
      stage: "confirm",
      result: {
        organizingOverview: {
          permanentCount: 6,
          isolatedCount: 4,
          connectedCount: 2,
          writingReady: true,
          recommendedFirst: [
            { noteId: "pn_1", title: "易经需要慢读" },
            { noteId: "pn_2", title: "变化是常态" }
          ],
          themeCandidates: [
            { title: "情境判断训练", noteCount: 5, noteIds: ["pn_1", "pn_2"] }
          ]
        }
      }
    },
    title: "导入完成",
    statusLabel: "完成",
    raw: "{}"
  });

  assert.match(html, /整理首页/);
  assert.match(html, /导入永久笔记/);
  assert.match(html, /还未关联/);
  assert.match(html, /建议先处理/);
  assert.match(html, /易经需要慢读/);
  assert.match(html, /可写主题线索/);
  assert.match(html, /情境判断训练/);
  assert.match(html, /可以开始写作准备/);
});

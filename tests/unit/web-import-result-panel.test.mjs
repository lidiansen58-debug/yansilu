import test from "node:test";
import assert from "node:assert/strict";
import { renderImportResultPanel } from "../../apps/web/src/import-result-panel.js";

test("preview prioritizes the selectable list over repeated metadata and follow-up suggestions", () => {
  const html = renderImportResultPanel({
    data: { stage: "preview" }, subtitle: "imp_test",
    candidatePreviewHtml: "SELECTABLE-NOTES",
    metrics: [{ label: "可导入内容", value: "1 永久" }],
    warnings: [{ code: "CHECK_REQUIRED", message: "Needs checking", detail: "Preserved detail" }], actions: ["Review the source"]
  });
  assert.ok(html.indexOf("SELECTABLE-NOTES") < html.indexOf("Review the source"));
  assert.doesNotMatch(html, /result-subtitle|result-metrics/);
  assert.match(html, /Needs checking/);
  assert.match(html, /Preserved detail/);
  assert.doesNotMatch(html, /CHECK_REQUIRED/);
  assert.match(html, /result-candidates-detail" open/);
});

test("interrupted file inventory never truncates the missing or unconfirmed item", () => {
  const html = renderImportResultPanel({ data: { stage: "confirm_pending", importRecord: { recoveryResult: {
    checkpointAvailable: true, files: [
      { status: "verified", relativePath: "one.md" }, { status: "changed", relativePath: "two.md" },
      { status: "missing", relativePath: "three.md" }, { status: "verified", relativePath: "<four>.md" }
    ], pending: { noteId: "last-pending" }
  } } }, warnings: [{ code: "IMPORT_RECOVERY_FILE", message: "duplicate" }] });
  assert.match(html, /文件已缺失：three.md/);
  assert.match(html, /结果未确认：last-pending/);
  assert.match(html, /&lt;four&gt;.md/);
  assert.doesNotMatch(html, /duplicate/);
});

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
  assert.match(html, /导入明细/);
  assert.match(html, /跳过与保留/);
  assert.match(html, /写作后续/);
  assert.match(html, /原始数据/);
  assert.match(html, /result-detail-body/);
  assert.match(html, /result-candidates/);
  assert.match(html, /<details class="result-detail-section result-candidates-detail" open>/);
  assert.match(html, /&quot;stage&quot;:&quot;preview&quot;/);
});

test("completed import details remain collapsed instead of competing with the next action", () => {
  const html = renderImportResultPanel({ data: { stage: "confirm" }, candidatePreviewHtml: "CANDIDATES" });
  assert.match(html, /<details class="result-detail-section result-candidates-detail">/);
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

test("import result keeps one follow-up instead of duplicating home, theme and writing panels", () => {
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
    writingActionsHtml: '<button class="mini-btn primary" data-import-writing-action="open-today">去首页整理</button>',
    raw: "{}"
  });

  assert.match(html, /去首页整理/);
  assert.equal((html.match(/data-import-writing-action=/g) || []).length, 1);
  assert.doesNotMatch(html, /import-organizing-home|未关联笔记|可成主题|可进入写作|易经需要慢读|情境判断训练/);
  assert.doesNotMatch(html, /候选|队列|复核|线索/);
});

test("import result panel does not suggest isolated-note handling without a recommended note", () => {
  const html = renderImportResultPanel({
    data: {
      stage: "confirm",
      result: {
        organizingOverview: {
          permanentCount: 3,
          isolatedCount: 0,
          connectedCount: 3,
          writingReady: true,
          recommendedFirst: [],
          themeCandidates: [{ title: "已可写作主题", noteCount: 3, noteIds: ["pn_1", "pn_2", "pn_3"] }]
        }
      }
    },
    title: "导入完成",
    statusLabel: "完成",
    writingActionsHtml: '<button class="mini-btn primary" data-import-writing-action="open-today">去首页整理</button>'
  });

  assert.doesNotMatch(html, /data-import-writing-action="open-first-isolated-note"/);
  assert.doesNotMatch(html, /处理第一条未关联笔记/);
  assert.match(html, /去首页/);
  assert.doesNotMatch(html, /已可写作主题/);
});

test("completed import puts audit metadata after the next action in closed details", () => {
  const html = renderImportResultPanel({ data: { stage: "confirm" }, subtitle: "internal-id",
    metrics: [{ label: "已选", value: "4/5" }], candidatePreviewHtml: "ALL-NOTES",
    writingActionsHtml: "NEXT-ACTION" });
  assert.doesNotMatch(html, /result-subtitle/);
  assert.ok(html.indexOf("NEXT-ACTION") < html.indexOf("4/5"));
  assert.match(html, /<details class="result-detail-section result-candidates-detail">/);
  assert.match(html, /ALL-NOTES/);
});

test("specific originality reasons replace only the duplicate summary, not unrelated warnings", () => {
  const html = renderImportResultPanel({ data: { stage: "preview" }, warnings: [
    { code: "ORIGINALITY_GUARD_BLOCKED", message: "DUPLICATE" },
    { code: "ORIGINALITY_BLOCKED", message: "My note: TOO CLOSE" },
    { code: "UNREADABLE", message: "File could not be read" }
  ] });
  assert.doesNotMatch(html, /DUPLICATE/);
  assert.match(html, /My note: TOO CLOSE/);
  assert.match(html, /File could not be read/);
});

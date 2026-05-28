import test from "node:test";
import assert from "node:assert/strict";
import { renderImportResultMount } from "../../apps/web/src/import-result-mount.js";

test("import result mount renders preview content through model and panel", () => {
  const html = renderImportResultMount({
    data: {
      stage: "preview",
      importRecordId: "imp_mount",
      connector: "markdown",
      status: "preview",
      summary: { sources: 1, literatureNotes: 1, permanentNotes: 2, warnings: 1 },
      warnings: [{ code: "IMPORT_MALFORMED_FRONTMATTER", message: "bad frontmatter" }]
    },
    candidatePreviewHtml: '<div class="result-candidates">candidate preview</div>',
    raw: '{"stage":"preview"}'
  });

  assert.match(html, /result-card/);
  assert.match(html, /result-candidates/);
  assert.match(html, /bad frontmatter/);
  assert.match(html, /建议先修正 frontmatter 再导入。/);
  assert.match(html, /&quot;stage&quot;:&quot;preview&quot;/);
});

test("import result mount renders rollback warnings and custom sub-sections", () => {
  const html = renderImportResultMount({
    data: {
      stage: "rollback",
      importRecordId: "imp_rb",
      status: "rolled_back",
      result: {
        rolledBack: [{ path: "notes/a.md" }],
        skippedFiles: [{ path: "notes/b.md", reason: "modified" }]
      }
    },
    skipBreakdownHtml: '<div class="skip-breakdown">skip breakdown</div>',
    writingActionsHtml: '<div class="writing-actions">writing actions</div>',
    writingDetailsHtml: '<div class="writing-preview">writing preview</div>',
    raw: '{"stage":"rollback"}'
  });

  assert.match(html, /skip-breakdown/);
  assert.match(html, /writing-actions/);
  assert.match(html, /writing-preview/);
  assert.match(html, /result-json/);
});

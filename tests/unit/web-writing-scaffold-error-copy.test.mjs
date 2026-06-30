import test from "node:test";
import assert from "node:assert/strict";

import { resultTitle } from "../../apps/web/src/import-result-model.js";

test("writing scaffold error titles use 文章提纲 Markdown wording", () => {
  assert.equal(resultTitle("writing_copy_scaffold_error"), "文章提纲 Markdown 复制失败");
  assert.equal(resultTitle("writing_export_scaffold_error"), "文章提纲 Markdown 导出失败");
});

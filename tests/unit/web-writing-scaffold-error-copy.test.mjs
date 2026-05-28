import test from "node:test";
import assert from "node:assert/strict";

import { resultTitle } from "../../apps/web/src/import-result-model.js";

test("writing scaffold error titles use current scaffold copy", () => {
  assert.equal(resultTitle("writing_copy_scaffold_error"), "复制草稿骨架失败");
  assert.equal(resultTitle("writing_export_scaffold_error"), "导出草稿骨架失败");
});

import test from "node:test";
import assert from "node:assert/strict";

import { readComponentsEditorPaneSource } from "./copy-source-helpers.mjs";

test("distillation quality ready state points to the writing basket instead of the writing center", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /一句话判断、三句话压缩和边界提示都已具备，可以继续确认观点或加入写作篮。/);
});

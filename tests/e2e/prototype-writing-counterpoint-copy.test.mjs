import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { runVisibleWritingReadinessFlow } from "./prototype-writing-readiness-flow-helpers.mjs";

test("prototype writing counterpoint prompt uses Chinese copy in scaffold result", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { source, markdown } = await runVisibleWritingReadinessFlow(stack, {
    prepared: true,
    sourceBoundary: "This readiness only makes sense after at least one explicit relation is added."
  });
  assert.ok(markdown.includes(`在「${source.title}」这一段里，要正面处理哪条反方或边界：This readiness only makes sense after at least one explicit relation is added.`));
  assert.doesNotMatch(markdown, /Address this counterpoint or boundary in|What counterpoint, limit, or exception should/);
});

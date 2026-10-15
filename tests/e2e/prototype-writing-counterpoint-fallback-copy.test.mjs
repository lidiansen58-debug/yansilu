import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { runVisibleWritingReadinessFlow } from "./prototype-writing-readiness-flow-helpers.mjs";

test("prototype writing counterpoint fallback prompt uses Chinese copy", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { source, scaffold, markdown } = await runVisibleWritingReadinessFlow(stack, { prepared: false });
  const check = scaffold.preflight.checks.find(item => item.id === "counterpoint_boundary");
  assert.equal(check.message, "正式起草前，至少先补一条反方或边界，不然论证会太顺。");
  assert.ok(markdown.includes(`「${source.title}」这一段还应该补出哪条反方、限制或例外？`));
  assert.doesNotMatch(check.message, /Add at least one boundary or counterpoint/);
  assert.doesNotMatch(markdown, /What counterpoint, limit, or exception should/);
});

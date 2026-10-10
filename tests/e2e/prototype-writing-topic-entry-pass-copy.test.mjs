import test from "node:test";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { runVisibleTopicRepairFlow } from "./prototype-writing-topic-repair-flow-helpers.mjs";

test("continuing a historical article preserves its empty question until the user fills it and generates an outline", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (stack) await runVisibleTopicRepairFlow(stack, { missingQuestion: false });
});
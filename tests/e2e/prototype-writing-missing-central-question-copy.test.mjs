import test from "node:test";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { runVisibleTopicRepairFlow } from "./prototype-writing-topic-repair-flow-helpers.mjs";

test("a historical theme without a question can be repaired visibly before continuing the same article", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (stack) await runVisibleTopicRepairFlow(stack, { missingQuestion: true });
});
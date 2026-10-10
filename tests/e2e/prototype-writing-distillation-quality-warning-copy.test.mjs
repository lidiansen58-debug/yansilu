import test from "node:test";
import { optionalPlaywright, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";
import { runVisibleWritingQualityFlow } from "./prototype-writing-quality-flow-helpers.mjs";

test("visible outline identifies repeated summary lines and clears the notice after source repair", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (stack) await runVisibleWritingQualityFlow(stack, "repetitive");
});

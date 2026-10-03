import test from "node:test";
import assert from "node:assert/strict";
import { createAppShellStateChangePrototypeDepsProvider } from "../../apps/web/src/app-shell-state-change-host-deps.js";
import { routeAppShellStateChange } from "../../apps/web/src/app-shell-state-change-router.js";

test("source distillation reaches the real host through assembled shell dependencies", async () => {
  const payload = { sourceNoteId: "source_1", sourceBody: "材料" };
  const result = { kind: "draft", draft: { coreArgument: "观点" } };
  let received;
  const deps = createAppShellStateChangePrototypeDepsProvider(() => ({ runSourceDistillAi: async input => { received = input; return result; } }));
  assert.equal(await routeAppShellStateChange("run-source-distill-ai", payload, deps()), result);
  assert.equal(received, payload);
});

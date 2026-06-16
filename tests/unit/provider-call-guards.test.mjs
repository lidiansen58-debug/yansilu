import test from "node:test";
import assert from "node:assert/strict";

import { assertProviderModelCallAllowed } from "../../packages/ai-orchestrator/src/provider-call-guards.mjs";

test("provider call guard requires explicit route confirmation before remote refine runs", () => {
  assert.throws(
    () =>
      assertProviderModelCallAllowed({
        body: {},
        prompt: "Potential relation refine prompt",
        providerExecution: {
          modelRoute: {
            confirmationRequired: true,
            selectedTier: "standard",
            modelRef: "openai_compatible_gateway:standard",
            providerId: "openai_compatible_gateway",
            modelPack: "Hybrid"
          },
          userSettings: {
            budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
          }
        },
        outputTokenEstimate: 320
      }),
    (error) => {
      assert.equal(error.code, "AI_ROUTE_CONFIRMATION_REQUIRED");
      assert.equal(error.details.budgetPrecheck.confirmationRequired, true);
      return true;
    }
  );
});

test("provider call guard allows refine after the user confirms the current AI setting", () => {
  const result = assertProviderModelCallAllowed({
    body: { confirmationApproved: true, confirmBudget: true },
    prompt: "Potential relation refine prompt",
    providerExecution: {
      modelRoute: {
        confirmationRequired: true,
        selectedTier: "standard",
        modelRef: "openai_compatible_gateway:standard",
        providerId: "openai_compatible_gateway",
        modelPack: "Hybrid"
      },
      userSettings: {
        budget: { monthlyLimit: 10, confirmationThresholdPerRun: 10 }
      }
    },
    outputTokenEstimate: 320
  });

  assert.equal(result.confirmationApproved, true);
});

test("provider call guard surfaces budget confirmation requirements for refine runs", () => {
  assert.throws(
    () =>
      assertProviderModelCallAllowed({
        body: {},
        prompt: "Expensive refine prompt " + "context ".repeat(400),
        providerExecution: {
          modelRoute: {
            confirmationRequired: false,
            selectedTier: "standard",
            modelRef: "openai_compatible_gateway:standard",
            providerId: "openai_compatible_gateway",
            modelPack: "Hybrid"
          },
          userSettings: {
            budget: { monthlyLimit: 10, confirmationThresholdPerRun: 0.00001 }
          }
        },
        outputTokenEstimate: 320
      }),
    (error) => {
      assert.equal(error.code, "AI_BUDGET_CONFIRMATION_REQUIRED");
      assert.equal(error.details.budgetPrecheck.status, "requires_confirmation");
      return true;
    }
  );
});

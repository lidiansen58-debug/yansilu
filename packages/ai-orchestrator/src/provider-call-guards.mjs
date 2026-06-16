import { evaluateBudgetPrecheck } from "./budget-policy.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

export function budgetApprovalInput(input = {}) {
  return {
    confirmBudget: input.confirmBudget,
    confirm_budget: input.confirm_budget,
    confirmationApproved: input.confirmationApproved,
    confirmation_approved: input.confirmation_approved,
    budgetConfirmation: input.budgetConfirmation || input.budget_confirmation
  };
}

export function estimateTextTokens(text = "") {
  return Math.max(1, Math.ceil(String(text || "").length / 3));
}

export function throwBudgetPrecheckError(precheck = {}) {
  const error = new Error(
    precheck.status === "blocked"
      ? "AI budget limit blocks this model call."
      : "This model call requires confirmation before running."
  );
  error.code = precheck.status === "blocked" ? "AI_BUDGET_EXCEEDED" : "AI_BUDGET_CONFIRMATION_REQUIRED";
  error.status = 400;
  error.details = { budgetPrecheck: precheck };
  return error;
}

export function assertProviderModelCallAllowed({ body = {}, prompt = "", providerExecution = null, outputTokenEstimate = 320 } = {}) {
  if (!providerExecution) return { ok: true, confirmationRequired: false, estimatedUsage: { estimatedCost: 0, currency: "USD" } };
  const budgetPrecheck = evaluateBudgetPrecheck({
    modelRoute: providerExecution.modelRoute,
    budget: providerExecution.userSettings?.budget,
    budgetState: body.budgetState || body.budget_state,
    trigger: body.trigger || "user_command",
    tierPrices: body.tierPrices || body.tier_prices,
    inputTokenEstimate: body.inputTokenEstimate ?? body.input_token_estimate ?? estimateTextTokens(prompt),
    outputTokenEstimate,
    ...budgetApprovalInput(body)
  });
  if (budgetPrecheck.status !== "allowed") throw throwBudgetPrecheckError(budgetPrecheck);
  const routeConfirmationRequired = providerExecution.modelRoute?.confirmationRequired === true;
  const routeConfirmationApproved = budgetPrecheck.confirmationApproved === true;
  if (routeConfirmationRequired && !routeConfirmationApproved) {
    const error = new Error("This model route requires confirmation before running.");
    error.code = "AI_ROUTE_CONFIRMATION_REQUIRED";
    error.status = 400;
    error.details = {
      modelRoute: providerExecution.modelRoute,
      budgetPrecheck: {
        ...budgetPrecheck,
        confirmationRequired: true,
        confirmationReason: "model_route_requires_confirmation"
      }
    };
    throw error;
  }
  return budgetPrecheck;
}

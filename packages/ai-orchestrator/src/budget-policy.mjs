function cleanText(value) {
  return String(value || "").trim();
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const DEFAULT_OUTPUT_TOKEN_ESTIMATES = {
  router_fast: 128,
  cheap_fast: 256,
  standard: 700,
  strong_reasoning: 1200,
  guardrail: 256,
  local_private: 512
};

const DEFAULT_TIER_PRICES = {
  router_fast: { inputPerMillionTokens: 0.05, outputPerMillionTokens: 0.2, currency: "USD" },
  cheap_fast: { inputPerMillionTokens: 0.15, outputPerMillionTokens: 0.6, currency: "USD" },
  standard: { inputPerMillionTokens: 1, outputPerMillionTokens: 4, currency: "USD" },
  strong_reasoning: { inputPerMillionTokens: 5, outputPerMillionTokens: 15, currency: "USD" },
  guardrail: { inputPerMillionTokens: 0.1, outputPerMillionTokens: 0.4, currency: "USD" },
  local_private: { inputPerMillionTokens: 0, outputPerMillionTokens: 0, currency: "USD" }
};

function priceForTier(tier, priceOverrides = {}) {
  const override = priceOverrides[tier] || priceOverrides.default || {};
  const fallback = DEFAULT_TIER_PRICES[tier] || DEFAULT_TIER_PRICES.standard;
  return {
    inputPerMillionTokens: finiteNumber(
      override.inputPerMillionTokens ?? override.input_per_million_tokens,
      fallback.inputPerMillionTokens
    ),
    outputPerMillionTokens: finiteNumber(
      override.outputPerMillionTokens ?? override.output_per_million_tokens,
      fallback.outputPerMillionTokens
    ),
    currency: cleanText(override.currency) || fallback.currency || "USD",
    source: cleanText(override.source) || "product_default"
  };
}

function normalizeBudget(input = {}) {
  return {
    monthlyLimit: optionalNumber(input.monthlyLimit ?? input.monthly_limit),
    monthlySpent: finiteNumber(input.monthlySpent ?? input.monthly_spent, 0),
    confirmationThresholdPerRun: optionalNumber(input.confirmationThresholdPerRun ?? input.confirmation_threshold_per_run),
    maxEstimatedCostPerRun: optionalNumber(input.maxEstimatedCostPerRun ?? input.max_estimated_cost_per_run),
    scheduledTaskHardCap: optionalNumber(input.scheduledTaskHardCap ?? input.scheduled_task_hard_cap),
    scheduledTaskSpent: finiteNumber(input.scheduledTaskSpent ?? input.scheduled_task_spent, 0),
    currency: cleanText(input.currency) || "USD"
  };
}

function confirmationApproved(input = {}) {
  const confirmation = input.confirmation || input.budgetConfirmation || input.budget_confirmation || {};
  return (
    input.confirmBudget === true ||
    input.confirm_budget === true ||
    input.confirmationApproved === true ||
    input.confirmation_approved === true ||
    confirmation.approved === true ||
    confirmation.decision === "approved"
  );
}

export function estimateModelRunUsage(input = {}) {
  const contextPack = input.contextPack || input.context_pack || {};
  const modelRoute = input.modelRoute || input.model_route || {};
  const tier = cleanText(modelRoute.selectedTier || modelRoute.selected_tier || input.modelTier || input.model_tier) || "standard";
  const inputTokens = Math.max(
    0,
    Math.ceil(
      finiteNumber(
        input.inputTokenEstimate ??
          input.input_token_estimate ??
          contextPack.budget?.estimatedInputTokens ??
          contextPack.budget?.estimated_input_tokens,
        0
      )
    )
  );
  const outputTokens = Math.max(
    0,
    Math.ceil(
      finiteNumber(
        input.outputTokenEstimate ?? input.output_token_estimate,
        DEFAULT_OUTPUT_TOKEN_ESTIMATES[tier] || DEFAULT_OUTPUT_TOKEN_ESTIMATES.standard
      )
    )
  );
  const price = priceForTier(tier, input.tierPrices || input.tier_prices || {});
  const estimatedCost =
    tier === "local_private" || modelRoute.localOnly === true || modelRoute.local_only === true
      ? 0
      : (inputTokens * price.inputPerMillionTokens + outputTokens * price.outputPerMillionTokens) / 1_000_000;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: Number(estimatedCost.toFixed(8)),
    currency: price.currency,
    usageSource: "product_precheck_estimate",
    pricingSource: price.source
  };
}

export function evaluateBudgetPrecheck(input = {}) {
  const modelRoute = input.modelRoute || input.model_route || {};
  const routeBudget = modelRoute.budget || {};
  const budget = normalizeBudget({
    ...routeBudget,
    ...(input.budget || {}),
    ...(input.budgetState || input.budget_state || {})
  });
  const usage = estimateModelRunUsage(input);
  const trigger = cleanText(input.trigger || input.taskTrigger || input.task_trigger);
  const isScheduled = trigger === "scheduled" || trigger === "scheduled_task";
  const approved = confirmationApproved(input);
  const reasons = [];

  const monthlyRemaining =
    budget.monthlyLimit === null ? null : Math.max(0, Number((budget.monthlyLimit - budget.monthlySpent).toFixed(8)));
  if (usage.estimatedCost > 0 && monthlyRemaining !== null && usage.estimatedCost > monthlyRemaining) {
    reasons.push("monthly_budget_exceeded");
  }

  if (usage.estimatedCost > 0 && budget.maxEstimatedCostPerRun !== null && usage.estimatedCost > budget.maxEstimatedCostPerRun) {
    reasons.push("per_run_budget_exceeded");
  }

  const scheduledRemaining =
    budget.scheduledTaskHardCap === null ? null : Math.max(0, Number((budget.scheduledTaskHardCap - budget.scheduledTaskSpent).toFixed(8)));
  if (isScheduled && usage.estimatedCost > 0 && scheduledRemaining !== null && usage.estimatedCost > scheduledRemaining) {
    reasons.push("scheduled_task_budget_exceeded");
  }

  const hardBlocked = reasons.length > 0;
  const confirmationThreshold = budget.confirmationThresholdPerRun;
  const confirmationRequired =
    !hardBlocked &&
    usage.estimatedCost > 0 &&
    confirmationThreshold !== null &&
    usage.estimatedCost > confirmationThreshold;

  return {
    status: hardBlocked ? "blocked" : confirmationRequired && !approved ? "requires_confirmation" : "allowed",
    decision: hardBlocked ? "blocked" : confirmationRequired && !approved ? "requires_confirmation" : "allowed",
    reasons: hardBlocked ? reasons : confirmationRequired ? ["expensive_run"] : [],
    estimatedUsage: usage,
    budget: {
      ...budget,
      monthlyRemaining,
      scheduledRemaining
    },
    confirmationRequired,
    confirmationApproved: approved,
    confirmationReason: confirmationRequired ? "expensive_run" : "",
    modelPack: cleanText(modelRoute.modelPack || modelRoute.model_pack),
    modelTier: cleanText(modelRoute.selectedTier || modelRoute.selected_tier),
    providerId: cleanText(modelRoute.providerId || modelRoute.provider_id),
    modelRef: cleanText(modelRoute.modelRef || modelRoute.model_ref)
  };
}

export function budgetDecisionStatuses() {
  return ["allowed", "requires_confirmation", "blocked"];
}

export function normalizeOriginalityPlan(input = {}) {
  const warnThresholdRaw = Number(input.warnThreshold);
  const blockThresholdRaw = Number(input.blockThreshold);
  const warnThreshold = Number.isFinite(warnThresholdRaw) ? warnThresholdRaw : 0.6;
  const blockThreshold = Number.isFinite(blockThresholdRaw) ? blockThresholdRaw : 0.8;
  const safeWarn = Math.max(0, Math.min(warnThreshold, 1));
  const safeBlock = Math.max(safeWarn, Math.min(blockThreshold, 1));
  return {
    warnThreshold: safeWarn,
    blockThreshold: safeBlock,
    requireCitationLocator: input.requireCitationLocator !== false,
    allowDraftOnWarning: input.allowDraftOnWarning !== false,
    blockOnBlocked: input.blockOnBlocked !== false
  };
}

export function tokenizeText(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function similarityScore(a, b) {
  const ta = tokenizeText(a);
  const tb = tokenizeText(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  if (!union) return 0;
  const jaccard = inter / union;
  const aText = String(a || "").trim().toLowerCase();
  const bText = String(b || "").trim().toLowerCase();
  if (aText && bText && (aText.includes(bText) || bText.includes(aText))) return Math.max(jaccard, 0.95);
  return jaccard;
}

export function originalityGuard(record, planInput = {}) {
  const plan = normalizeOriginalityPlan(planInput);
  const warnings = [];
  const literature = record.literature || [];
  const permanent = record.permanent || [];
  const flaggedPermanentIds = [];
  const evaluations = [];

  const litBySource = new Map();
  for (const ln of literature) {
    const sourceId = ln.source_id || "unknown";
    if (!litBySource.has(sourceId)) litBySource.set(sourceId, []);
    litBySource.get(sourceId).push(ln);
  }

  for (const pn of permanent) {
    const sourceId = pn.citations?.[0]?.source_id || "unknown";
    const locator = pn.citations?.[0]?.locator || "";
    const sourceNotes = litBySource.get(sourceId) || [];
    const pText = String(pn.core_claim || "").trim().toLowerCase();
    const reasons = [];

    let bestSimilarity = 0;
    for (const ln of sourceNotes) {
      const lText = String(ln.quote_text || "").trim().toLowerCase();
      if (!lText) continue;
      const sim = similarityScore(pText, lText);
      if (sim > bestSimilarity) bestSimilarity = sim;
    }

    let status = "pass";
    if (!pText) {
      status = "warning";
      reasons.push("core_claim_empty");
    } else if (bestSimilarity >= plan.blockThreshold) {
      status = "blocked";
      reasons.push("similarity_above_block_threshold");
    } else if (bestSimilarity >= plan.warnThreshold) {
      status = "warning";
      reasons.push("similarity_above_warn_threshold");
    }

    if (plan.requireCitationLocator && !String(locator).trim()) {
      if (status === "pass") status = "warning";
      reasons.push("citation_locator_missing");
    }

    if (status === "blocked") flaggedPermanentIds.push(pn.id);
    evaluations.push({
      permanentId: pn.id,
      similarity: Number(bestSimilarity.toFixed(4)),
      status,
      reasons,
      sourceId
    });
  }

  const warningCount = evaluations.filter((x) => x.status === "warning").length;
  if (warningCount) {
    warnings.push({
      code: "ORIGINALITY_GUARD_WARNING",
      message: "Some permanent note candidates require manual review.",
      count: warningCount
    });
  }
  if (flaggedPermanentIds.length) {
    warnings.push({
      code: "ORIGINALITY_GUARD_BLOCKED",
      message: "Some permanent note candidates are blocked by originality rules.",
      count: flaggedPermanentIds.length
    });
  }
  return { plan, warnings, flaggedPermanentIds, evaluations };
}

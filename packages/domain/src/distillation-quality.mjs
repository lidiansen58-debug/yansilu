function cleanText(value) {
  return String(value || "").trim();
}

function normalizeLooseText(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[\s.,;:!?'"“”‘’()\[\]{}<>/\\|`~@#$%^&*_+=-]+/g, "");
}

function countIdeaUnits(value) {
  const matches = cleanText(value).match(/[\u4e00-\u9fff]|[A-Za-z0-9]+/g);
  return Array.isArray(matches) ? matches.length : 0;
}

function stringItems(value) {
  return (Array.isArray(value) ? value : []).map((item) => cleanText(item));
}

function warning(id, field, message) {
  return { id, field, message, status: "warning" };
}

export function noteHasBoundarySignal(note = {}) {
  if (cleanText(note.boundaryOrCounterpoint || note.boundary_or_counterpoint)) return true;
  const body = cleanText(note.body || note.markdown || "");
  return /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i.test(body);
}

export function collectDistillationQualityWarnings(note = {}) {
  const warnings = [];
  const title = cleanText(note.title).replace(/^#+\s+/, "");
  const thesis = cleanText(note.thesis);
  const summary = stringItems(note.threeLineSummary || note.three_line_summary).slice(0, 3);

  if (!thesis) {
    warnings.push(warning("thesis_missing", "thesis", "还没有写出一句话判断。"));
  } else {
    const thesisUnits = countIdeaUnits(thesis);
    if (thesisUnits < 4) {
      warnings.push(warning("thesis_too_short", "thesis", "一句话判断过短，更像标签而不是判断。"));
    }
    if (thesisUnits > 32 || thesis.length > 90) {
      warnings.push(warning("thesis_too_long", "thesis", "一句话判断过长，建议压到一个可被反驳的判断。"));
    }
    if (title && normalizeLooseText(thesis) === normalizeLooseText(title)) {
      warnings.push(warning("thesis_title_like", "thesis", "一句话判断和标题几乎一样，还像标题而不是判断。"));
    }
  }

  if (summary.length !== 3 || summary.some((line) => !line)) {
    warnings.push(warning("summary_incomplete", "three_line_summary", "三句话压缩还不完整，需要恰好三句。"));
  } else {
    const normalized = summary.map((line) => normalizeLooseText(line));
    if (new Set(normalized).size < normalized.length) {
      warnings.push(warning("summary_repetitive", "three_line_summary", "三句话压缩里有重复句，理由和用途还没有拉开。"));
    }
    if (countIdeaUnits(summary[1]) < 4) {
      warnings.push(warning("summary_reason_weak", "three_line_summary", "第二句还不够像理由，建议补为什么它成立或重要。"));
    }
    if (countIdeaUnits(summary[2]) < 4) {
      warnings.push(warning("summary_relevance_weak", "three_line_summary", "第三句还不够像用途，建议补它服务于哪个问题或写作方向。"));
    }
  }

  if (!noteHasBoundarySignal(note)) {
    warnings.push(warning("boundary_missing", "boundary_or_counterpoint", "还缺边界、反例或反方，论证容易太顺。"));
  }

  return warnings;
}

export function summarizeDistillationQuality(note = {}) {
  const warnings = collectDistillationQualityWarnings(note);
  return {
    status: warnings.length ? "needs_attention" : "ready",
    warningCount: warnings.length,
    warnings
  };
}

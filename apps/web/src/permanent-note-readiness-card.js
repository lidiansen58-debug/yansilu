function cleanText(value = "") {
  return String(value || "").trim();
}

function summaryCount(note = {}) {
  return (Array.isArray(note.threeLineSummary) ? note.threeLineSummary : []).filter((line) => cleanText(line)).length;
}

function hasBoundary(note = {}) {
  if (cleanText(note.boundaryOrCounterpoint || note.boundary_or_counterpoint)) return true;
  return /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i.test(String(note.body || note.markdown || ""));
}

export function permanentNoteReadinessItems(note = {}, options = {}) {
  const authorshipConfirmed = Boolean(note?.authorship?.user_confirmed || options.authorshipConfirmed);
  const active = cleanText(note.status).toLowerCase() === "active";
  const thesis = cleanText(note.thesis);
  const summaries = summaryCount(note);
  const confirmed = cleanText(note.distillationStatus).toLowerCase() === "confirmed";
  const relationCount = Number(options.explicitRelationCount || note.explicitRelationCount || note.explicit_relation_count || 0);
  return [
    {
      key: "authorship",
      label: "作者确认",
      done: authorshipConfirmed,
      action: "确认这段判断归你负责"
    },
    {
      key: "originality",
      label: "原创确认",
      done: active,
      action: "完成原创性检查"
    },
    {
      key: "judgment",
      label: "一句话判断 / 三句压缩",
      done: Boolean(thesis) && summaries === 3 && confirmed,
      action: !thesis ? "补一句自己的判断" : summaries < 3 ? `补齐三句话，还差 ${3 - summaries} 句` : "确认观点"
    },
    {
      key: "boundary",
      label: "边界 / 反例",
      done: hasBoundary(note),
      action: "补一条不成立条件"
    },
    {
      key: "relation",
      label: "正式关系",
      done: relationCount > 0,
      action: "补一条关系理由"
    }
  ];
}

export function permanentNoteReadinessSummary(note = {}, options = {}) {
  const items = permanentNoteReadinessItems(note, options);
  const doneCount = items.filter((item) => item.done).length;
  const next = items.find((item) => !item.done) || items[items.length - 1] || null;
  return {
    doneCount,
    totalCount: items.length,
    nextAction: next?.action || "可以组织成可写主题",
    items
  };
}

export function renderPermanentNoteReadinessCard(note = {}, options = {}) {
  const { escapeHtml = (value) => String(value ?? "") } = options;
  const summary = permanentNoteReadinessSummary(note, options);
  return `
    <div class="distillation-readiness" data-permanent-note-readiness-card>
      <div class="semantic-relation-group-head">
        <strong>可写材料成熟度</strong>
        <span>${escapeHtml(`${summary.doneCount}/${summary.totalCount}`)}</span>
      </div>
      <div class="related-empty">下一步：${escapeHtml(summary.nextAction)}</div>
      <div class="distillation-readiness-list">
        ${summary.items.map((item) => `
          <div class="distillation-readiness-item ${item.done ? "is-done" : ""}" data-readiness-item="${escapeHtml(item.key)}">
            <span>${escapeHtml(item.done ? "完成" : "待补")}</span>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(item.done ? "已满足" : item.action)}</small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

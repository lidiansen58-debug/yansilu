import { candidateGroups, isConfirmableCandidate } from "./import-candidate-preview-model.js";

const PAGE_SIZE = 12;

function matchesFilter(item, filter, selectedIds, guard) {
  if (filter === "blocked") return item.originalityStatus === "blocked";
  if (filter === "warning") return item.originalityStatus === "warning";
  if (filter === "risky") return ["blocked", "warning"].includes(item.originalityStatus);
  if (filter === "safe") return item.originalityStatus !== "blocked";
  if (filter === "confirmable") return isConfirmableCandidate(item, guard);
  if (filter === "excluded") return !selectedIds.has(String(item.id || ""));
  return true;
}

export function importCandidatePage(candidatePreview, options = {}) {
  const selectedIds = options.summary?.selectedIds instanceof Set ? options.summary.selectedIds : new Set();
  const focusIds = new Set(options.focusCandidateIds || []);
  const groups = candidateGroups(candidatePreview)
    .sort((left, right) => Number(left.title === "Source") - Number(right.title === "Source"));
  const items = groups.flatMap(group => group.items.map(item => ({ ...item, candidateGroup: group.title })))
    .filter(item => options.interactive
      ? matchesFilter(item, options.focusReason, selectedIds, options.originalityGuard)
      : !focusIds.size || focusIds.has(String(item.id || "")));
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const requested = Number(options.page);
  const page = Math.min(pageCount, Math.max(1, Number.isFinite(requested) ? Math.trunc(requested) : 1));
  const start = (page - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);
  return { page, pageCount, total: items.length, start: items.length ? start + 1 : 0, end: start + visible.length,
    groups: groups.map(group => ({ ...group, items: visible.filter(item => item.candidateGroup === group.title) }))
      .filter(group => group.items.length) };
}

export function importPreviewPageForState(state, { importRecordId, stage, focusReason }) {
  const key = JSON.stringify([importRecordId, stage, focusReason || ""]);
  if (state.candidatePageKey !== key) {
    state.candidatePageKey = key;
    state.candidatePage = 1;
  }
  return state.candidatePage || 1;
}

export function changeImportPreviewPage(state, value) {
  const current = Number(state.candidatePage) || 1;
  const next = value === "previous" ? current - 1 : value === "next" ? current + 1 : Number(value);
  if (Number.isFinite(next)) state.candidatePage = Math.max(1, Math.trunc(next));
}

export function renderImportCandidatePagination(model) {
  if (model.pageCount <= 1) return "";
  return `<nav class="candidate-pagination" aria-label="导入笔记分页">
    <span class="toolbar-note" role="status">${model.start}-${model.end} / ${model.total} 条</span>
    <div class="candidate-pagination-controls">
      <button class="mini-btn" type="button" data-candidate-page="previous" aria-label="上一页" title="上一页"${model.page === 1 ? " disabled" : ""}>&lsaquo;</button>
      <select data-candidate-page-select="1" aria-label="选择预览页">
        ${Array.from({ length: model.pageCount }, (_, index) => `<option value="${index + 1}"${index + 1 === model.page ? " selected" : ""}>${index + 1} / ${model.pageCount}</option>`).join("")}
      </select>
      <button class="mini-btn" type="button" data-candidate-page="next" aria-label="下一页" title="下一页"${model.page === model.pageCount ? " disabled" : ""}>&rsaquo;</button>
    </div>
  </nav>`;
}

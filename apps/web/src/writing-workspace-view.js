import {
  describeWritingContinuationAction,
  describeWritingDraftStepState,
  describeWritingMaterialStepState,
  describeWritingProjectPreflight,
  describeWritingProjectStepState,
  describeWritingScaffoldStepState,
  groupWritingPreflightChecks,
  isWritingScaffoldReadyForDraft
} from "./writing-center-flow.js";

function defaultEscapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function writingWorkspaceViewDeps(deps = {}) {
  return {
    escapeHtml: deps.escapeHtml || defaultEscapeHtml,
    renderThinkingStatusBadge: deps.renderThinkingStatusBadge,
    writingProjectStatusLabel: deps.writingProjectStatusLabel
  };
}

export function renderWritingStatusCardView(label, value, note, tone = "", deps = {}) {
  const { escapeHtml } = writingWorkspaceViewDeps(deps);
  return `
    <div class="writing-status-card" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

export function renderWritingToplineMetricView(label, value, note, tone = "", deps = {}) {
  const { escapeHtml } = writingWorkspaceViewDeps(deps);
  return `
    <div class="writing-topline-metric" data-tone="${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong>
      <small title="${escapeHtml(note)}">${escapeHtml(note)}</small>
    </div>
  `;
}

export function writingFlowStepItems({
  basketCount = 0,
  hasProject = false,
  projectEntry = null,
  writingState = {}
} = {}) {
  const hasScaffold = Boolean(writingState.scaffold?.id || writingState.project?.scaffold_id);
  const hasDraft = Boolean(writingState.project?.draft_note_id);
  const projectPreflight = writingState.project?.preflight || null;
  const projectPreflightSummary = describeWritingProjectPreflight(projectPreflight);
  const projectPreflightChecks = Array.isArray(projectPreflight?.checks) ? projectPreflight.checks : [];
  const preflightGroups = groupWritingPreflightChecks(writingState.scaffold?.preflight || null);
  const materialStep = describeWritingMaterialStepState({ basketCount });
  const projectStep = describeWritingProjectStepState({
    basketCount,
    hasProject,
    projectId: writingState.project?.id || "",
    projectEntryStatus: projectEntry?.status || "",
    projectEntryHint: projectEntry?.hint || "",
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryActionLabel: hasProject ? "" : String(projectEntry?.actionLabel || "").trim(),
    canCreateProject: Boolean(projectEntry?.canCreateProject),
    projectPreflightLevel: hasProject ? projectPreflightSummary.level : "",
    projectPreflightHint: hasProject ? projectPreflightSummary.hint : "",
    projectPreflightChecksLength: hasProject ? projectPreflightChecks.length : 0
  });
  const scaffoldStep = describeWritingScaffoldStepState({
    hasScaffold,
    hasProject,
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryActionLabel: hasProject ? "" : String(projectEntry?.actionLabel || "").trim(),
    blockingCount: preflightGroups.blocking.length,
    warningCount: preflightGroups.warnings.length
  });
  const draftStep = describeWritingDraftStepState({
    hasDraft,
    hasScaffold,
    projectEntryProjectId: hasProject ? "" : String(projectEntry?.projectId || "").trim(),
    projectEntryAction: hasProject ? "" : String(projectEntry?.action || "").trim(),
    projectPreflightLevel: hasProject ? projectPreflightSummary.level : "",
    projectPreflightHint: hasProject ? projectPreflightSummary.hint : ""
  });
  const scaffoldReadyForDraft = isWritingScaffoldReadyForDraft({
    hasScaffold,
    blockingCount: preflightGroups.blocking.length
  });
  return [
    {
      done: basketCount > 0,
      title: materialStep.title,
      note: materialStep.note
    },
    {
      done: hasProject,
      title: projectStep.title,
      note: projectStep.note
    },
    {
      done: scaffoldReadyForDraft,
      title: scaffoldStep.title,
      note: scaffoldStep.note
    },
    {
      done: hasDraft,
      title: draftStep.title,
      note: draftStep.note
    }
  ];
}

export function renderWritingFlowStepsView(steps = [], deps = {}) {
  const { escapeHtml } = writingWorkspaceViewDeps(deps);
  const items = Array.isArray(steps) ? steps : [];
  const firstOpenIndex = items.findIndex((step) => !step.done);
  const activeIndex = firstOpenIndex >= 0 ? firstOpenIndex : items.length - 1;
  return items
    .map((step, index) => {
      const stateClass = step.done ? "is-done" : index === activeIndex ? "is-active" : "";
      return `
        <div class="writing-flow-step ${stateClass}">
          <span>${escapeHtml(index + 1)}</span>
          <strong>${escapeHtml(step.title)}</strong>
          <small>${escapeHtml(step.note)}</small>
        </div>
      `;
    })
    .join("");
}

export function renderWritingProjectCardView(project, deps = {}) {
  const {
    escapeHtml,
    renderThinkingStatusBadge = () => "",
    writingProjectStatusLabel = (value) => value
  } = writingWorkspaceViewDeps(deps);
  const draftLabel = project?.draft_note?.title || project?.draft_note_id || "未绑定草稿";
  const scaffoldLabel = project?.scaffold_id || "未生成";
  const hasScaffold = Boolean(project?.scaffold_id);
  const sourceCount = Array.isArray(project?.related_index_ids) ? project.related_index_ids.length : 0;
  const continuation = describeWritingContinuationAction({
    existingProjectId: project?.id || "",
    existingProjectHasScaffold: hasScaffold,
    existingProjectHasDraft: Boolean(project?.draft_note_id),
    scopeLabel: "当前项目"
  });
  const primaryProjectAction = String(continuation?.action || "open").trim() || "open";
  const primaryProjectActionLabel = String(continuation?.actionLabel || "打开项目").trim() || "打开项目";
  const primaryProjectStatus = String(continuation?.status || "打开项目").trim() || "打开项目";
  const thinkingBadge = renderThinkingStatusBadge(project?.thinkingStatus, "thinking-status-badge writing-thinking-status");
  return `
    <article class="writing-note-card" data-writing-project-id="${escapeHtml(project?.id || "")}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(project?.title || project?.id || "")}</div>
          <div class="writing-note-meta">${escapeHtml(project?.id || "")} 路 ${escapeHtml(writingProjectStatusLabel(project?.status))} 路 篮子 ${escapeHtml(project?.basket_count || 0)}</div>
        </div>
        ${thinkingBadge}
      </div>
      <div class="writing-note-meta">草稿骨架：${escapeHtml(scaffoldLabel)}；草稿：${escapeHtml(draftLabel)}；当前入口：${escapeHtml(primaryProjectStatus)}；写作中心入口 ${escapeHtml(sourceCount)}</div>
      <div class="writing-note-meta">${escapeHtml(project?.goal || "暂无写作目标说明。")}</div>
      <div class="writing-note-actions">
        <button class="mini-btn" type="button" data-writing-project-action="${escapeHtml(primaryProjectAction)}" data-writing-project-id="${escapeHtml(project?.id || "")}">${escapeHtml(primaryProjectActionLabel)}</button>
        <button class="mini-btn" type="button" data-writing-project-action="copy-scaffold" data-writing-project-id="${escapeHtml(project?.id || "")}" ${hasScaffold ? "" : "disabled"}>复制草稿骨架</button>
        <button class="mini-btn" type="button" data-writing-project-action="export-scaffold" data-writing-project-id="${escapeHtml(project?.id || "")}" ${hasScaffold ? "" : "disabled"}>导出草稿骨架 .md</button>
      </div>
    </article>
  `;
}

export function renderScaffoldVersionCardView(version, { activeScaffoldId = "" } = {}, deps = {}) {
  const { escapeHtml } = writingWorkspaceViewDeps(deps);
  const isActive = String(activeScaffoldId || "") === String(version?.id || "");
  const versionNote = String(version?.version_note || "").trim();
  return `
    <article class="writing-note-card ${isActive ? "selected" : ""}" data-writing-scaffold-id="${escapeHtml(version?.id || "")}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">${escapeHtml(version?.id || "")}</div>
          <div class="writing-note-meta">${escapeHtml(version?.generated_by || "writing-engine")} 路 章节 ${escapeHtml(version?.section_count || 0)}</div>
        </div>
      </div>
      <div class="writing-note-meta">生成于：${escapeHtml(version?.created_at || version?.updated_at || "")}${isActive ? " 路 当前预览中" : ""}</div>
      <div class="writing-note-meta">说明：${escapeHtml(versionNote || "自动生成的草稿骨架版本")}</div>
        <div class="writing-note-actions">
          <button class="mini-btn" type="button" data-writing-scaffold-action="open" data-writing-scaffold-id="${escapeHtml(version?.id || "")}">打开版本</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="copy" data-writing-scaffold-id="${escapeHtml(version?.id || "")}">复制</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="export" data-writing-scaffold-id="${escapeHtml(version?.id || "")}">导出</button>
          <button class="mini-btn" type="button" data-writing-scaffold-action="edit-note" data-writing-scaffold-id="${escapeHtml(version?.id || "")}">编辑说明</button>
        </div>
    </article>
  `;
}

export function renderDraftVersionCardView(version, deps = {}) {
  const {
    escapeHtml,
    writingProjectStatusLabel = (value) => value
  } = writingWorkspaceViewDeps(deps);
  const noteTitle = version?.note?.title || version?.draft_note_id || "未命名草稿";
  const noteStatus = writingProjectStatusLabel(version?.note?.status || "draft");
  const sourceScaffold = version?.source_scaffold_id || "未记录";
  const versionNote = String(version?.version_note || "").trim();
  return `
    <article class="writing-note-card ${version?.is_current ? "selected" : ""}" data-writing-draft-version-id="${escapeHtml(version?.id || "")}">
      <div class="writing-note-card-head">
        <div>
          <div class="writing-note-title">v${escapeHtml(version?.version_no || 0)} 路 ${escapeHtml(noteTitle)}</div>
          <div class="writing-note-meta">${escapeHtml(version?.draft_note_id || "")} 路 ${escapeHtml(noteStatus)}${version?.is_current ? " 路 当前版本" : ""}</div>
        </div>
      </div>
      <div class="writing-note-meta">来源草稿骨架：${escapeHtml(sourceScaffold)}</div>
      <div class="writing-note-meta">说明：${escapeHtml(versionNote || "从当前草稿骨架保存的草稿版本")}</div>
      <div class="writing-note-meta">创建时间：${escapeHtml(version?.created_at || "")}</div>
        <div class="writing-note-actions">
          <button class="mini-btn" type="button" data-writing-draft-action="open" data-writing-draft-note-id="${escapeHtml(version?.draft_note_id || "")}">打开草稿版本</button>
          <button class="mini-btn" type="button" data-writing-draft-action="edit-note" data-writing-draft-version-id="${escapeHtml(version?.id || "")}" data-writing-draft-note-id="${escapeHtml(version?.draft_note_id || "")}">编辑说明</button>
          ${
            version?.is_current
              ? `<button class="mini-btn" type="button" disabled>当前版本</button>`
              : `<button class="mini-btn" type="button" data-writing-draft-action="set-current" data-writing-draft-note-id="${escapeHtml(version?.draft_note_id || "")}">设为当前版本</button>`
        }
      </div>
    </article>
  `;
}

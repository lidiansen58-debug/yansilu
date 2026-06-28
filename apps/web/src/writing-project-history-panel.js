export function renderWritingProjectHistoryDom({
  writingState = {},
  projectEntry = {},
  hasProject = false,
  projectsHint = null,
  projectsList = null,
  scaffoldVersionsHint = null,
  scaffoldVersionsList = null,
  draftVersionsHint = null,
  draftVersionsList = null,
  renderWritingProjectCard = () => "",
  renderScaffoldVersionCard = () => "",
  renderDraftVersionCard = () => "",
  escapeHtml = (value) => String(value ?? "")
} = {}) {
  if (projectsHint) {
    const filterSummary = [
      writingState.projectFilters.q ? `搜索“${writingState.projectFilters.q}”` : "",
      writingState.projectFilters.status !== "all" ? `状态 ${writingState.projectFilters.status}` : "",
      writingState.projectFilters.hasDraft === "true" ? "仅看有草稿" : "",
      writingState.projectFilters.hasDraft === "false" ? "仅看无草稿" : ""
    ]
      .filter(Boolean)
      .join("，");
    if (writingState.loadingProjects && writingState.projects.length) projectsHint.textContent = `正在刷新最近项目... 当前显示 ${writingState.projects.length} 个项目。`;
    else if (writingState.loadingProjects) projectsHint.textContent = "正在读取最近项目...";
    else if (writingState.projects.length) projectsHint.textContent = `${filterSummary ? `${filterSummary}，` : ""}共找到 ${writingState.projects.length} 个项目。`;
    else if (filterSummary) projectsHint.textContent = `${filterSummary}，但暂时没有匹配项目。`;
    else if (!hasProject && projectEntry.projectId) projectsHint.textContent = `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    else projectsHint.textContent = `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
  }
  if (projectsList) {
    if (writingState.loadingProjects) {
      projectsList.innerHTML = writingState.projects.length
        ? writingState.projects.map(renderWritingProjectCard).join("")
        : `<div class="writing-empty">正在加载最近项目...</div>`;
    } else if (writingState.projects.length) {
      projectsList.innerHTML = writingState.projects.map(renderWritingProjectCard).join("");
    } else {
      projectsList.innerHTML = !hasProject && projectEntry.projectId
        ? `<div class="writing-empty">当前写作篮已经对应 ${escapeHtml(projectEntry.status)}。直接用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，会比重新创建项目更连续。</div>`
        : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    }
  }

  if (scaffoldVersionsHint) {
    if (!writingState.project?.id) {
      scaffoldVersionsHint.textContent =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里就会显示当前项目的草稿骨架版本。`
          : `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    }
    else if (writingState.loadingScaffoldVersions && writingState.scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `正在刷新草稿骨架版本... 当前显示 ${writingState.scaffoldVersions.length} 个版本。`;
    } else if (writingState.loadingScaffoldVersions) scaffoldVersionsHint.textContent = "正在读取草稿骨架版本...";
    else if (writingState.scaffoldVersions.length) scaffoldVersionsHint.textContent = `当前项目共有 ${writingState.scaffoldVersions.length} 个草稿骨架版本。`;
    else scaffoldVersionsHint.textContent = "当前项目还没有草稿骨架版本。";
  }
  if (scaffoldVersionsList) {
    if (!writingState.project?.id) {
      scaffoldVersionsList.innerHTML =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `<div class="writing-empty">当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里就会显示当前项目的历史草稿骨架版本。</div>`
          : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.length
        ? writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿骨架版本...</div>`;
    } else if (writingState.scaffoldVersions.length) {
      scaffoldVersionsList.innerHTML = writingState.scaffoldVersions.map(renderScaffoldVersionCard).join("");
    } else {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">还没有草稿骨架版本。点击“生成草稿骨架”后会开始累积版本。</div>`;
    }
  }

  if (draftVersionsHint) {
    if (!writingState.project?.id) {
      draftVersionsHint.textContent =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `当前写作篮已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里就会显示当前项目的草稿版本。`
          : `当前写作篮入口：${projectEntry.status}。${projectEntry.hint}`;
    }
    else if (writingState.loadingDraftVersions && writingState.draftVersions.length) {
      draftVersionsHint.textContent = `正在刷新草稿版本... 当前显示 ${writingState.draftVersions.length} 个版本。`;
    } else if (writingState.loadingDraftVersions) draftVersionsHint.textContent = "正在读取草稿版本...";
    else if (writingState.draftVersions.length) draftVersionsHint.textContent = `当前项目共有 ${writingState.draftVersions.length} 个草稿版本。`;
    else draftVersionsHint.textContent = "当前项目还没有草稿版本。";
  }
  if (draftVersionsList) {
    if (!writingState.project?.id) {
      draftVersionsList.innerHTML =
        projectEntry?.projectId && projectEntry?.actionLabel
          ? `<div class="writing-empty">当前写作篮已经对应${escapeHtml(projectEntry.status)}。先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里就会显示当前项目的草稿版本。</div>`
          : `<div class="writing-empty">当前写作篮入口：${escapeHtml(projectEntry.status)}。${escapeHtml(projectEntry.hint)}</div>`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsList.innerHTML = writingState.draftVersions.length
        ? writingState.draftVersions.map(renderDraftVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿版本...</div>`;
    } else if (writingState.draftVersions.length) {
      draftVersionsList.innerHTML = writingState.draftVersions.map(renderDraftVersionCard).join("");
    } else {
      draftVersionsList.innerHTML = `<div class="writing-empty">还没有草稿版本。点击“保存为草稿笔记”后会开始累积版本。</div>`;
    }
  }
}

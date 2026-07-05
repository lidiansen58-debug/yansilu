function projectFilterSummary(writingState = {}) {
  const filters = [];
  const query = String(writingState.projectFilters?.q || "").trim();
  const status = String(writingState.projectFilters?.status || "all").trim();
  const hasDraft = String(writingState.projectFilters?.hasDraft || "all").trim();
  if (query) filters.push(`搜索“${query}”`);
  if (status && status !== "all") filters.push(`状态：${status}`);
  if (hasDraft === "true") filters.push("只看已有草稿");
  if (hasDraft === "false") filters.push("只看还没有草稿的主题");
  return filters.join("，");
}

function projectEntryText(projectEntry = {}, escapeHtml = String) {
  const status = escapeHtml(projectEntry.status || "还没有确定主题");
  const hint = escapeHtml(projectEntry.hint || "先从主题库选择一个可写主题，或回到首页按推荐路径整理。");
  return `当前相关笔记状态：${status}。${hint}`;
}

function continueExistingProjectText(projectEntry = {}, escapeHtml = String) {
  return `<div class="writing-empty">当前相关笔记已经对应 ${escapeHtml(projectEntry.status)}。用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，会比重新开始更连贯。</div>`;
}

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
  const projects = Array.isArray(writingState.projects) ? writingState.projects : [];
  const scaffoldVersions = Array.isArray(writingState.scaffoldVersions) ? writingState.scaffoldVersions : [];
  const draftVersions = Array.isArray(writingState.draftVersions) ? writingState.draftVersions : [];
  const filterSummary = projectFilterSummary(writingState);

  if (projectsHint) {
    if (writingState.loadingProjects && projects.length) {
      projectsHint.textContent = `正在刷新最近写作项目，当前显示 ${projects.length} 个。`;
    } else if (writingState.loadingProjects) {
      projectsHint.textContent = "正在读取最近写作项目...";
    } else if (projects.length) {
      projectsHint.textContent = `${filterSummary ? `${filterSummary}，` : ""}找到 ${projects.length} 个写作项目。可以打开示例写作项目，看看主题如何变成提纲和草稿。`;
    } else if (filterSummary) {
      projectsHint.textContent = `${filterSummary}，暂时没有匹配的写作项目。`;
    } else {
      projectsHint.textContent = projectEntryText(projectEntry);
    }
  }

  if (projectsList) {
    if (writingState.loadingProjects) {
      projectsList.innerHTML = projects.length
        ? projects.map(renderWritingProjectCard).join("")
        : `<div class="writing-empty">正在加载最近写作项目...</div>`;
    } else if (projects.length) {
      projectsList.innerHTML = projects.map(renderWritingProjectCard).join("");
    } else if (!hasProject && projectEntry.projectId) {
      projectsList.innerHTML = continueExistingProjectText(projectEntry, escapeHtml);
    } else {
      projectsList.innerHTML = `<div class="writing-empty">${escapeHtml(projectEntryText(projectEntry))}</div>`;
    }
  }

  if (scaffoldVersionsHint) {
    if (!writingState.project?.id) {
      scaffoldVersionsHint.textContent = projectEntry?.projectId && projectEntry?.actionLabel
        ? `当前相关笔记已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里会显示这个主题的文章提纲版本。`
        : projectEntryText(projectEntry);
    } else if (writingState.loadingScaffoldVersions && scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `正在刷新文章提纲版本，当前显示 ${scaffoldVersions.length} 个。`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsHint.textContent = "正在读取文章提纲版本...";
    } else if (scaffoldVersions.length) {
      scaffoldVersionsHint.textContent = `当前主题共有 ${scaffoldVersions.length} 个文章提纲版本。`;
    } else {
      scaffoldVersionsHint.textContent = "当前主题还没有文章提纲版本。生成文章提纲后会在这里积累。";
    }
  }

  if (scaffoldVersionsList) {
    if (!writingState.project?.id) {
      scaffoldVersionsList.innerHTML = projectEntry?.projectId && projectEntry?.actionLabel
        ? `<div class="writing-empty">先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里会显示这个主题的历史文章提纲。</div>`
        : `<div class="writing-empty">${escapeHtml(projectEntryText(projectEntry))}</div>`;
    } else if (writingState.loadingScaffoldVersions) {
      scaffoldVersionsList.innerHTML = scaffoldVersions.length
        ? scaffoldVersions.map(renderScaffoldVersionCard).join("")
        : `<div class="writing-empty">正在加载文章提纲版本...</div>`;
    } else if (scaffoldVersions.length) {
      scaffoldVersionsList.innerHTML = scaffoldVersions.map(renderScaffoldVersionCard).join("");
    } else {
      scaffoldVersionsList.innerHTML = `<div class="writing-empty">还没有文章提纲版本。点击“生成文章提纲”后会开始积累版本。</div>`;
    }
  }

  if (draftVersionsHint) {
    if (!writingState.project?.id) {
      draftVersionsHint.textContent = projectEntry?.projectId && projectEntry?.actionLabel
        ? `当前相关笔记已经对应${projectEntry.status}。先用上面的“${projectEntry.actionLabel}”继续，这里会显示这个主题的草稿版本。`
        : projectEntryText(projectEntry);
    } else if (writingState.loadingDraftVersions && draftVersions.length) {
      draftVersionsHint.textContent = `正在刷新草稿版本，当前显示 ${draftVersions.length} 个。`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsHint.textContent = "正在读取草稿版本...";
    } else if (draftVersions.length) {
      draftVersionsHint.textContent = `当前主题共有 ${draftVersions.length} 个草稿版本。`;
    } else {
      draftVersionsHint.textContent = "当前主题还没有草稿版本。保存草稿后会在这里积累。";
    }
  }

  if (draftVersionsList) {
    if (!writingState.project?.id) {
      draftVersionsList.innerHTML = projectEntry?.projectId && projectEntry?.actionLabel
        ? `<div class="writing-empty">先用上面的“${escapeHtml(projectEntry.actionLabel)}”继续，这里会显示这个主题的历史草稿。</div>`
        : `<div class="writing-empty">${escapeHtml(projectEntryText(projectEntry))}</div>`;
    } else if (writingState.loadingDraftVersions) {
      draftVersionsList.innerHTML = draftVersions.length
        ? draftVersions.map(renderDraftVersionCard).join("")
        : `<div class="writing-empty">正在加载草稿版本...</div>`;
    } else if (draftVersions.length) {
      draftVersionsList.innerHTML = draftVersions.map(renderDraftVersionCard).join("");
    } else {
      draftVersionsList.innerHTML = `<div class="writing-empty">还没有草稿版本。点击“保存为草稿笔记”后会开始积累版本。</div>`;
    }
  }
}

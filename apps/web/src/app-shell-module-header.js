export function renderModuleWorkspaceHeaderForRuntime({
  state = {},
  elements = {},
  settingsState = {},
  moduleUi = {},
  settingsHeader = null,
  settingsPackOptionsHtml = "",
  currentAiProviderId = () => "",
  activateModule = () => {},
  applyAiModelPackChange = () => {},
  refreshAiRoutePreview = async () => {},
  renderModuleWorkspaceHeader = () => {},
  renderSettingsPanel = () => {},
  setStatus = () => {},
  todayReturnTarget = null,
  escapeHtml = (value) => String(value ?? "")
} = {}) {
  const {
    moduleTitle = null,
    moduleSummary = null,
    moduleHeaderActions = null,
    moduleBackToNotes = null,
    moduleAiModelPack = null,
    moduleAiRefreshRoute = null
  } = elements;
  if (!moduleTitle || !moduleSummary || !moduleHeaderActions) return false;

  const todayReturnButtonHtml =
    todayReturnTarget && state.module !== "today" && state.module !== "settings"
      ? `<button class="mini-btn module-return-today" id="moduleBackToToday" type="button">返回</button>`
      : "";
  const bindTodayReturnButton = () => {
    moduleHeaderActions.querySelector?.("#moduleBackToToday")?.addEventListener?.("click", () => activateModule("today"));
  };

  if (state.module === "explorer") {
    moduleHeaderActions.innerHTML = todayReturnButtonHtml;
    bindTodayReturnButton();
    return true;
  }

  if (state.module === "settings") {
    moduleTitle.textContent = settingsHeader?.title || "";
    moduleSummary.textContent = settingsHeader?.summary || "";
    moduleHeaderActions.innerHTML = "";
    return true;
  }

  moduleTitle.textContent = moduleUi.title || "";
  moduleSummary.textContent = moduleUi.summary || "";
  if (state.module === "graph") {
    moduleTitle.textContent = "";
    moduleSummary.textContent = "";
    moduleHeaderActions.innerHTML = todayReturnButtonHtml;
    bindTodayReturnButton();
    return true;
  }

  const preview = settingsState.ai?.routePreview;
  const providerId = String(preview?.provider?.providerId || currentAiProviderId() || "").trim();
  const modelRef = String(preview?.route?.modelRef || "").trim();
  const localOnly = Boolean(preview?.route?.localOnly);
  const healthStatus = String(preview?.health?.status || "").trim();
  const statusTone = healthStatus === "healthy" ? "ok" : healthStatus ? "warn" : "";
  const displayModelRef = modelRef.includes(":")
    ? modelRef.slice(modelRef.lastIndexOf(":") + 1)
    : modelRef;
  const headerHealthLabelMap = {
    healthy: "已连接",
    degraded: "需检查",
    down: "不可用",
    unknown: "待试运行"
  };
  const statusLabel = localOnly ? "本地" : "云端";
  const statusDetail = providerId
    ? `${localOnly ? "本地 AI" : "AI 服务"}${displayModelRef ? ` / ${displayModelRef}` : ""}`
    : displayModelRef
      ? displayModelRef
      : "AI 连接暂不可用";
  if (state.module === "imports" || state.module === "today" || state.module === "writing") {
    moduleHeaderActions.innerHTML = state.module === "today" ? "" : todayReturnButtonHtml;
    bindTodayReturnButton();
    return true;
  }

  moduleHeaderActions.innerHTML = `
    ${todayReturnButtonHtml}
    <button class="mini-btn" id="moduleBackToNotes">回到笔记</button>
    <span class="settings-stat-badge ${localOnly ? "ok" : ""}">${escapeHtml(statusLabel)}</span>
    <span class="settings-stat-badge ${statusTone}">${escapeHtml(headerHealthLabelMap[healthStatus] || healthStatus || "待确认")}</span>
    <span class="settings-stat-badge">${escapeHtml(statusDetail)}</span>
    <span class="module-ai-pack">
      <strong>AI</strong>
      <select id="moduleAiModelPack" aria-label="AI 方案">
        ${settingsPackOptionsHtml}
      </select>
    </span>
    <button class="mini-btn" id="moduleAiRefreshRoute" type="button">刷新</button>
  `;
  bindTodayReturnButton();

  (moduleHeaderActions.querySelector?.("#moduleBackToNotes") || elements.moduleBackToNotes || moduleBackToNotes)?.addEventListener?.("click", () => activateModule("explorer"));

  const pack = moduleHeaderActions.querySelector?.("#moduleAiModelPack") || elements.moduleAiModelPack || moduleAiModelPack;
  if (pack) {
    const stored = String(settingsState.ai?.modelPack || "Starter Auto").trim() || "Starter Auto";
    if (pack.value !== stored) pack.value = stored;
    pack.addEventListener("change", (event) => {
      const next = String(event?.target?.value || "Starter Auto").trim() || "Starter Auto";
      applyAiModelPackChange(next, { source: "module" });
    });
  }

  (moduleHeaderActions.querySelector?.("#moduleAiRefreshRoute") || elements.moduleAiRefreshRoute || moduleAiRefreshRoute)?.addEventListener?.("click", async () => {
    await refreshAiRoutePreview({ render: false });
    renderModuleWorkspaceHeader();
    renderSettingsPanel();
    setStatus("AI 连接信息已刷新", "ok");
  });
  return true;
}

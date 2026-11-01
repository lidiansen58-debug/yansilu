import { renderWritingThemeIndexCardDom } from "./writing-theme-card-panel.js";
import { escapeHtml } from "./editor-render-utils.js";

const libraryStates = new WeakMap();
const EMPTY_THEMES = [];

function libraryState(writingState) {
  const themes = Array.isArray(writingState.themeIndexes) ? writingState.themeIndexes : EMPTY_THEMES;
  const projects = writingState.projects || EMPTY_THEMES;
  let state = libraryStates.get(writingState);
  // A refreshed directory or Vault supplies a new collection. Its old filter
  // must not hide the new topics or retain titles from another library.
  if (!state || state.themes !== themes || state.projects !== projects) {
    const manual = projects.filter(project => project.entry_mode === "manual");
    const sameThemes = state?.themes === themes;
    state = { themes, projects, items: [...manual, ...themes], expanded: sameThemes && state.expanded, query: sameThemes ? state.query : "" };
    libraryStates.set(writingState, state);
  }
  return state;
}

export function renderWritingThemeLibrary({ $ = () => null, writingState = {}, ...deps } = {}) {
  const list = $("writingThemeIndexList");
  if (!list) return;
  const state = libraryState(writingState);
  const loading = Boolean(writingState.loadingThemeIndexes);
  const controls = $("writingThemeLibraryTools");
  const toggle = $("btnWritingExpandThemes");
  const search = $("writingThemeSearch");
  const canExpand = state.items.length > 3;
  if (controls) controls.hidden = !canExpand;
  if (toggle) {
    toggle.disabled = loading;
    toggle.textContent = state.expanded ? "收起" : `显示全部 ${state.items.length} 个主题`;
    toggle.setAttribute?.("aria-expanded", state.expanded ? "true" : "false");
  }
  if (search) {
    search.hidden = !state.expanded;
    search.disabled = loading;
    if (search.value !== state.query) search.value = state.query;
  }
  const query = state.expanded ? state.query.trim().toLocaleLowerCase() : "";
  const matches = query
    ? state.items.filter(item => [item.title, item.central_question, item.centralQuestion, item.summary]
        .some(value => String(value || "").toLocaleLowerCase().includes(query)))
    : state.items;
  const visible = state.expanded ? matches : matches.slice(0, 3);
  list.innerHTML = visible.length
    ? visible.map(item => state.projects.includes(item)
      ? renderManualTheme(item, deps.escapeHtml || escapeHtml)
      : renderWritingThemeIndexCardDom({ ...deps, writingState }, item)).join("")
    : `<div class="writing-empty">${loading ? "正在加载可写主题..." : query ? "没有匹配的主题，试试其他关键词。" : "从一个问题或自己的想法开始写。"}</div>`;
}

function renderManualTheme(project, escapeHtml) {
  return `<article class="writing-start-topic" data-writing-project-id="${escapeHtml(project.id)}">
    <div class="writing-note-card-head"><div class="writing-note-title">${escapeHtml(project.title)}</div>
      <button class="mini-btn primary" type="button" data-writing-index-action="resume-project" data-writing-project-id="${escapeHtml(project.id)}">继续写</button>
    </div></article>`;
}

export function installWritingThemeLibraryEvents({ $ = () => null, depsProvider = () => ({}) } = {}) {
  const toggle = $("btnWritingExpandThemes");
  const search = $("writingThemeSearch");
  toggle?.addEventListener?.("click", () => {
    const deps = depsProvider();
    if (!deps.writingState || deps.writingState.loadingThemeIndexes) return;
    const state = libraryState(deps.writingState);
    state.expanded = !state.expanded;
    if (deps.renderWritingPanel) deps.renderWritingPanel();
    else renderWritingThemeLibrary({ ...deps, $ });
  });
  search?.addEventListener?.("input", event => {
    const deps = depsProvider();
    if (!deps.writingState || deps.writingState.loadingThemeIndexes) return;
    libraryState(deps.writingState).query = String(event.target.value || "");
    // The search control itself is never replaced, so typing keeps its focus.
    if (deps.renderWritingPanel) deps.renderWritingPanel();
    else renderWritingThemeLibrary({ ...deps, $ });
  });
}

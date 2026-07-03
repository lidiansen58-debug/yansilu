import {
  discoverWritableThemeSuggestions,
  themeDiscoverySuggestionToCreatePayload
} from "./writable-theme-discovery-model.js";

function cleanText(value = "") {
  return String(value || "").trim();
}

function unique(items = []) {
  return [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];
}

export function createWritableThemeDiscoveryController(depsProvider = () => ({})) {
  function deps() {
    return depsProvider() || {};
  }

  function writingState() {
    return deps().writingState || {};
  }

  function suggestionById(suggestionId = "") {
    const id = cleanText(suggestionId);
    return (Array.isArray(writingState().themeDiscoverySuggestions) ? writingState().themeDiscoverySuggestions : [])
      .find((item) => item.id === id) || null;
  }

  function refreshSuggestions() {
    const {
      candidateNotes = () => [],
      relations = () => [],
      existingThemeIndexes = () => [],
      ignoredSuggestionKeys = () => writingState().ignoredThemeDiscoverySuggestionKeys || [],
      aiTopicCandidates = () => [],
      parseTags = () => [],
      noteById = () => null,
      renderWritingPanel = () => {},
      setStatus = () => {}
    } = deps();
    const state = writingState();
    state.themeDiscoveryLoading = true;
    renderWritingPanel();
    try {
      const suggestions = discoverWritableThemeSuggestions({
        notes: candidateNotes(),
        relations: relations(),
        existingThemeIndexes: existingThemeIndexes(),
        ignoredSuggestionKeys: ignoredSuggestionKeys(),
        aiTopicCandidates: aiTopicCandidates(),
        parseTags,
        noteById,
        limit: 6
      });
      state.themeDiscoverySuggestions = suggestions;
      setStatus(
        suggestions.length
          ? `已发现 ${suggestions.length} 条可写主题建议；确认前不会保存。`
          : "暂时没有发现可写主题建议。",
        suggestions.length ? "ok" : "warn"
      );
      return suggestions;
    } finally {
      state.themeDiscoveryLoading = false;
      renderWritingPanel();
    }
  }

  function ignoreSuggestion(suggestionId = "") {
    const suggestion = suggestionById(suggestionId);
    if (!suggestion) return false;
    const state = writingState();
    state.ignoredThemeDiscoverySuggestionKeys = unique([
      ...(state.ignoredThemeDiscoverySuggestionKeys || []),
      suggestion.key
    ]);
    state.themeDiscoverySuggestions = (state.themeDiscoverySuggestions || []).filter((item) => item.id !== suggestion.id);
    deps().renderWritingPanel?.();
    deps().setStatus?.("已忽略这条可写主题建议；没有保存任何内容。", "ok");
    return true;
  }

  async function saveSuggestion(suggestionId = "", draft = {}) {
    const suggestion = suggestionById(suggestionId);
    if (!suggestion) throw new Error("theme discovery suggestion is missing");
    if (!suggestion.canSave) throw new Error("suggestion cannot be saved");
    const {
      createIndexCard = async () => null,
      writingThemeIndexScopeDirectoryId = () => "",
      upsertWritingThemeIndex = () => {},
      setWritingSourceIndexIds = () => {},
      setSelectedWritingThemeIndex = () => {},
      useThemeIndexAsWritingEntry = async () => ({}),
      openWritingModule = async () => {},
      renderWritingPanel = () => {},
      setStatus = () => {}
    } = deps();
    const payload = themeDiscoverySuggestionToCreatePayload(suggestion, draft, {
      directoryId: writingThemeIndexScopeDirectoryId()
    });
    const card = await createIndexCard(payload);
    if (!card?.id) throw new Error("主题索引笔记创建失败");
    upsertWritingThemeIndex(card);
    setWritingSourceIndexIds([card.id]);
    setSelectedWritingThemeIndex(card.id);
    await useThemeIndexAsWritingEntry(card.id, {
      replaceBasket: true,
      resetContext: true,
      source: "writable_theme_discovery"
    });
    await openWritingModule({
      statusMessage: `已从可写主题建议保存并进入写作中心：${payload.title}`,
      preserveFocusedCandidateScope: true,
      entryReason: "从用户确认的可写主题建议继续写作",
      entrySourceLabel: "可写主题建议"
    });
    const state = writingState();
    state.themeDiscoverySuggestions = (state.themeDiscoverySuggestions || []).filter((item) => item.id !== suggestion.id);
    state.ignoredThemeDiscoverySuggestionKeys = unique([
      ...(state.ignoredThemeDiscoverySuggestionKeys || []),
      suggestion.key
    ]);
    renderWritingPanel();
    setStatus(`已保存可写主题建议：${payload.title}`, "ok", { priority: 3, holdMs: 4200 });
    return card;
  }

  return {
    refreshSuggestions,
    ignoreSuggestion,
    saveSuggestion
  };
}

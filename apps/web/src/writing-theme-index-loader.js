export function beginWritingThemeIndexRequest(writingState, isCurrent = () => true) {
  const serial = (writingState.themeIndexRequestSerial || 0) + 1;
  writingState.themeIndexRequestSerial = serial;
  const ownsRequest = () => writingState.themeIndexRequestSerial === serial;
  return { ownsRequest, isCurrent: () => ownsRequest() && isCurrent() };
}

export async function fetchWritingThemeIndexesForScope({ listIndexCards, isCurrent = () => true }) {
  if (!isCurrent()) return [];
  // The library belongs to the current Vault. Material folders only determine
  // where new themes and drafts are saved, not which saved work can be reopened.
  const query = { includeDescendants: true, indexType: "topic", limit: 50 };
  const items = new Map();
  for (let offset = 0; isCurrent(); offset += query.limit) {
    const page = await listIndexCards({ ...query, ...(offset ? { offset } : {}) });
    if (!isCurrent()) return [];
    const previousSize = items.size;
    for (const item of page) items.set(item?.id ?? item, item);
    if (page.length < query.limit) return [...items.values()];
    // An older server ignoring pagination must not turn into an endless load.
    if (items.size === previousSize) throw new Error("主题列表未能完整读取，请重试。");
  }
  return [];
}

export async function loadWritingThemeIndexesForRuntime({
  writingState, listIndexCards, renderWritingPanel, isCurrent = () => true
}) {
  if (!isCurrent()) return [];
  const request = beginWritingThemeIndexRequest(writingState, isCurrent);
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    const items = await fetchWritingThemeIndexesForScope({ listIndexCards,
      isCurrent: request.isCurrent });
    if (!request.isCurrent()) return [];
    writingState.themeIndexes = items;
    return items;
  } finally {
    if (request.ownsRequest()) {
      writingState.loadingThemeIndexes = false;
      if (isCurrent()) renderWritingPanel();
    }
  }
}

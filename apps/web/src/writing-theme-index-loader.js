export function beginWritingThemeIndexRequest(writingState, isCurrent = () => true) {
  const serial = (writingState.themeIndexRequestSerial || 0) + 1;
  writingState.themeIndexRequestSerial = serial;
  const ownsRequest = () => writingState.themeIndexRequestSerial === serial;
  return { ownsRequest, isCurrent: () => ownsRequest() && isCurrent() };
}

export async function fetchWritingThemeIndexesForScope({ directoryId, listIndexCards, isCurrent = () => true }) {
  if (!isCurrent()) return [];
  const query = { includeDescendants: true, indexType: "topic", limit: 50 };
  const readScope = async scope => {
    const items = new Map();
    for (let offset = 0; isCurrent(); offset += query.limit) {
      const page = await listIndexCards({ ...scope, ...query, ...(offset ? { offset } : {}) });
      if (!isCurrent()) return [];
      const previousSize = items.size;
      for (const item of page) items.set(item?.id ?? item, item);
      if (page.length < query.limit) return [...items.values()];
      // An older server ignoring pagination must not turn into an endless load.
      if (items.size === previousSize) throw new Error("主题列表未能完整读取，请重试。");
    }
    return [];
  };
  let items = await readScope({ directoryId });
  if (!isCurrent()) return [];
  // A note folder without themes should not strand the writer. This changes
  // only the picker, not the directory used to create a new theme.
  if (!items.length && String(directoryId || "").trim()) {
    items = await readScope({});
  }
  return isCurrent() ? items : [];
}

export async function loadWritingThemeIndexesForRuntime({
  writingState, directoryId, listIndexCards, renderWritingPanel, isCurrent = () => true
}) {
  if (!isCurrent()) return [];
  const request = beginWritingThemeIndexRequest(writingState, isCurrent);
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    const items = await fetchWritingThemeIndexesForScope({ directoryId, listIndexCards,
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

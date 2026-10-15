export function beginWritingThemeIndexRequest(writingState, isCurrent = () => true) {
  const serial = (writingState.themeIndexRequestSerial || 0) + 1;
  writingState.themeIndexRequestSerial = serial;
  const ownsRequest = () => writingState.themeIndexRequestSerial === serial;
  return { ownsRequest, isCurrent: () => ownsRequest() && isCurrent() };
}

export async function fetchWritingThemeIndexesForScope({ directoryId, listIndexCards, isCurrent = () => true }) {
  if (!isCurrent()) return [];
  const query = { includeDescendants: true, indexType: "topic", limit: 12 };
  let items = await listIndexCards({ directoryId, ...query });
  if (!isCurrent()) return [];
  // A note folder without themes should not strand the writer. This changes
  // only the picker, not the directory used to create a new theme.
  if (!items.length && String(directoryId || "").trim()) {
    items = await listIndexCards(query);
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

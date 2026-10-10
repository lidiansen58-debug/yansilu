export async function loadWritingThemeIndexesForRuntime({
  writingState, directoryId, listIndexCards, renderWritingPanel, isCurrent = () => true
}) {
  if (!isCurrent()) return [];
  const serial = (writingState.themeIndexRequestSerial || 0) + 1;
  writingState.themeIndexRequestSerial = serial;
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    const items = await listIndexCards({ directoryId, includeDescendants: true, indexType: "topic", limit: 12 });
    if (writingState.themeIndexRequestSerial !== serial || !isCurrent()) return [];
    writingState.themeIndexes = items;
    return items;
  } finally {
    if (writingState.themeIndexRequestSerial === serial) {
      writingState.loadingThemeIndexes = false;
      if (isCurrent()) renderWritingPanel();
    }
  }
}

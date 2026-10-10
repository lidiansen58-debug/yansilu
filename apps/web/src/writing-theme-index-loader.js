export async function loadWritingThemeIndexesForRuntime({
  writingState, directoryId, listIndexCards, renderWritingPanel, isCurrent = () => true
}) {
  if (!isCurrent()) return [];
  const serial = (writingState.themeIndexRequestSerial || 0) + 1;
  writingState.themeIndexRequestSerial = serial;
  writingState.loadingThemeIndexes = true;
  renderWritingPanel();
  try {
    let items = await listIndexCards({ directoryId, includeDescendants: true, indexType: "topic", limit: 12 });
    if (writingState.themeIndexRequestSerial !== serial || !isCurrent()) return [];
    // Reading a note in a folder without themes should not strand the writer.
    // The unscoped query still belongs to the current Vault; it changes only
    // the picker, not the directory used when creating a new theme.
    if (!items.length && String(directoryId || "").trim()) {
      items = await listIndexCards({ includeDescendants: true, indexType: "topic", limit: 12 });
    }
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

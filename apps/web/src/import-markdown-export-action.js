export function createImportMarkdownExportAction(deps = {}) {
  const {
    $ = () => null,
    desktopCommands = {},
    directoryPathLabel = value => value,
    updateExportTargetHint = () => {},
    exportMarkdown = async () => ({}),
    showExportResult = () => {},
    setStatus = () => {}
  } = deps;

  return async function exportCurrentDirectory() {
    const directoryId = String($("exportDirectoryId")?.value || "").trim();
    if (!directoryId) return setStatus("请先选择永久笔记目录", "warn");
    let targetPath = String($("exportTargetPath")?.value || "").trim();
    try {
      if (!targetPath) {
        const picked = await desktopCommands.browseDirectory?.({ defaultPath: "", purpose: "导出目录" });
        targetPath = String(picked?.path || "").trim();
        if (targetPath) {
          $("exportTargetPath").value = targetPath;
          $("exportAdvanced")?.setAttribute("open", "open");
          updateExportTargetHint();
        }
      }
      if (!targetPath) return setStatus("请先选择导出目标目录", "warn");
      const result = await exportMarkdown({ targetPath, directoryId });
      showExportResult({
        stage: "export_markdown",
        targetPath,
        directoryId,
        directoryLabel: directoryPathLabel(directoryId),
        exportJobId: result.exportJobId,
        status: result.status,
        copied: result.copied,
        copiedBreakdown: result.copiedBreakdown || null
      });
      setStatus(`已导出 ${result.copied} 个文件`, "ok");
    } catch (error) {
      showExportResult({
        stage: "export_error",
        targetPath,
        directoryId,
        directoryLabel: directoryPathLabel(directoryId),
        message: String(error?.message || error),
        code: error?.code || null,
        details: error?.details || null
      });
      setStatus(`导出失败：${String(error?.message || error)}`, "bad");
    }
  };
}

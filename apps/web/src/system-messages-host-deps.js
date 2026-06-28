export function buildSystemMessagesPrototypeHostDeps(host = {}) {
  return {
    $: host.$,
    document: host.document,
    getMessages: host.getMessages,
    getSelectedMessageId: host.getSelectedMessageId,
    setSelectedMessageId: host.setSelectedMessageId,
    notes: host.notes,
    escapeHtml: host.escapeHtml,
    hideEditorHelper: host.hideEditorHelper,
    renderSystemMessages: host.renderSystemMessages
  };
}

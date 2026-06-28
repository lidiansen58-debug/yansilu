export function buildSystemMessagesPrototypeHostDeps(host = {}) {
  const getMessagesRef = host.getMessagesRef || (() => []);
  const getSelectedMessageIdRef = host.getSelectedMessageIdRef || (() => "");
  const setSelectedMessageIdRef = host.setSelectedMessageIdRef || (() => {});
  return {
    $: host.$,
    document: host.document,
    getMessages: () => getMessagesRef(),
    getSelectedMessageId: () => getSelectedMessageIdRef(),
    setSelectedMessageId: (messageId = "") => {
      const next = String(messageId || "").trim();
      setSelectedMessageIdRef(next);
      return next;
    },
    notes: host.notes,
    escapeHtml: host.escapeHtml,
    hideEditorHelper: host.hideEditorHelper,
    renderSystemMessages: host.renderSystemMessages
  };
}

export function createSystemMessagesPrototypeHostProvider(hostProvider = () => ({})) {
  return () => buildSystemMessagesPrototypeHostDeps(hostProvider());
}

import {
  closeSystemMessagesDom,
  isSystemMessageModalOpenDom,
  openSystemMessagesDom,
  renderSystemMessagesDom
} from "./system-messages-controller.js";
import {
  systemMessageActionLabel,
  systemMessageDisplayTitle,
  systemMessagePreviewText,
  systemMessageSubjectText
} from "./prototype-system-messages.js";

export function createSystemMessagesDomDeps(host = {}) {
  return {
    ...host,
    systemMessageActionLabel,
    systemMessageDisplayTitle,
    systemMessagePreviewText,
    systemMessageSubjectText
  };
}

export function renderSystemMessagesShell(host = {}) {
  return renderSystemMessagesDom(createSystemMessagesDomDeps(host));
}

export function openSystemMessagesShell(options = {}, host = {}) {
  return openSystemMessagesDom(options, createSystemMessagesDomDeps(host));
}

export function closeSystemMessagesShell(host = {}) {
  return closeSystemMessagesDom(createSystemMessagesDomDeps(host));
}

export function isSystemMessageModalOpenShell(host = {}) {
  return isSystemMessageModalOpenDom(createSystemMessagesDomDeps(host));
}

export function createSystemMessagesShellController(options = {}) {
  const hostProvider = options.hostProvider || (() => ({}));
  return {
    renderSystemMessages: () => renderSystemMessagesShell(hostProvider()),
    openSystemMessages: ({ latestOnly = false } = {}) => openSystemMessagesShell({ latestOnly }, hostProvider()),
    closeSystemMessages: () => closeSystemMessagesShell(hostProvider()),
    isSystemMessageModalOpen: () => isSystemMessageModalOpenShell(hostProvider())
  };
}

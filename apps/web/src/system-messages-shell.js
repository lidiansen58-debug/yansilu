import {
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

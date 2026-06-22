import {
  renderWritingPanelDom,
  renderWritingScaffoldPreviewDom
} from "./writing-panel-controller.js";
import {
  describeWritingContinuationAction,
  describeWritingMaterialStatus,
  describeWritingStrongModelIdleSummary,
  describeWritingStrongModelStatus,
  planWritingCandidateFocus,
  describeWritingProjectEntryState,
  describeWritingNextActionFromState,
  describeWritingProjectPreflight,
  writingOpenDraftButtonState,
  writingScaffoldButtonState,
  writingStrongModelButtonState,
  groupWritingPreflightChecks,
  isWritingStrongModelReady
} from "./writing-center-flow.js";
import {
  deriveBasketWritingReadiness,
  describeProjectPreflight
} from "./writing-readiness.js";
import {
  buildWritingPanelState
} from "./prototype-writing-workspace.js";

export function createWritingPanelDomDeps(host = {}) {
  return {
    ...host,
    buildWritingPanelState,
    planWritingCandidateFocus,
    deriveBasketWritingReadiness,
    describeWritingProjectEntryState,
    describeWritingMaterialStatus,
    describeWritingProjectPreflight,
    describeProjectPreflight,
    groupWritingPreflightChecks,
    describeWritingNextActionFromState,
    isWritingStrongModelReady,
    describeWritingStrongModelStatus,
    writingOpenDraftButtonState,
    writingScaffoldButtonState,
    writingStrongModelButtonState,
    describeWritingContinuationAction,
    describeWritingStrongModelIdleSummary
  };
}

export function renderWritingPanelShell(host = {}) {
  return renderWritingPanelDom(createWritingPanelDomDeps(host));
}

export function renderWritingScaffoldPreviewShell(host = {}) {
  return renderWritingScaffoldPreviewDom(createWritingPanelDomDeps(host));
}

import {
  actionItems,
  resultBrief,
  resultMetrics,
  resultStatusLabel,
  resultSubtitle,
  resultTitle,
  resultTone,
  warningItems
} from "./import-result-model.js";
import { renderImportResultPanel } from "./import-result-panel.js";

export function renderImportResultMount({
  data = {},
  candidatePreviewHtml = "",
  skipBreakdownHtml = "",
  writingActionsHtml = "",
  writingDetailsHtml = "",
  raw = ""
} = {}) {
  const payload = data || {};
  const stage = String(payload.stage || "");
  const tone = resultTone(payload);
  const warnings = warningItems(payload);

  return renderImportResultPanel({
    data: payload,
    title: resultTitle(stage),
    subtitle: resultSubtitle(payload),
    brief: resultBrief(payload, tone),
    tone,
    statusLabel: resultStatusLabel(tone),
    metrics: resultMetrics(payload),
    warnings,
    actions: actionItems(payload, warnings),
    writingActionsHtml,
    skipBreakdownHtml,
    candidatePreviewHtml,
    writingDetailsHtml,
    raw
  });
}

import { candidatePreviewItems } from "./import-candidate-preview-model.js";

function uniqueIds(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function fallbackCandidateIds(candidatePreview = null) {
  return uniqueIds(candidatePreviewItems(candidatePreview).map((item) => item.id));
}

function fallbackPermanentIds(candidatePreview = null) {
  return uniqueIds(
    candidatePreviewItems(candidatePreview)
      .filter((item) => item.candidateGroup === "PermanentNote")
      .map((item) => item.id)
  );
}

function evaluationMap(originalityGuard = null) {
  return new Map(
    (Array.isArray(originalityGuard?.evaluations) ? originalityGuard.evaluations : []).map((item) => [
      String(item?.permanentId || item?.id || "").trim(),
      item
    ])
  );
}

function statusForCandidate(candidateId, evaluations, previewStatusById) {
  const id = String(candidateId || "").trim();
  return String(evaluations.get(id)?.status || previewStatusById.get(id) || "").trim();
}

function selectableForImport(candidateId, permanentIds, evaluations, previewStatusById, { allowDraftOnWarning, blockOnBlocked }) {
  if (!permanentIds.has(candidateId)) return true;
  const status = statusForCandidate(candidateId, evaluations, previewStatusById);
  if (status === "blocked") return !blockOnBlocked;
  if (status === "warning") return allowDraftOnWarning;
  return true;
}

export function selectedCandidateIdsForImportAction({
  action = "",
  candidatePreview = null,
  candidateSelection = null,
  originalityGuard = null,
  visibleOnly = false
} = {}) {
  const visibleCandidateIds = fallbackCandidateIds(candidatePreview);
  const allCandidateIds = uniqueIds(
    visibleOnly
      ? visibleCandidateIds
      : candidateSelection
      ? [
          ...(Array.isArray(candidateSelection.sources) ? candidateSelection.sources : []),
          ...(Array.isArray(candidateSelection.literatureNotes) ? candidateSelection.literatureNotes : []),
          ...(Array.isArray(candidateSelection.permanentNotes) ? candidateSelection.permanentNotes : [])
        ]
      : visibleCandidateIds
  );
  const permanentIds = new Set(
    visibleOnly
      ? uniqueIds(
          candidatePreviewItems(candidatePreview)
            .filter((item) => item.candidateGroup === "PermanentNote")
            .map((item) => item.id)
        )
      : candidateSelection
      ? uniqueIds(candidateSelection.permanentNotes)
      : fallbackPermanentIds(candidatePreview)
  );
  const previewStatusById = new Map(
    candidatePreviewItems(candidatePreview)
      .filter((item) => item?.id)
      .map((item) => [String(item.id || "").trim(), String(item.originalityStatus || "").trim()])
  );
  const evaluations = evaluationMap(originalityGuard);
  const plan = originalityGuard?.plan || {};
  const allowDraftOnWarning = plan.allowDraftOnWarning !== false;
  const blockOnBlocked = plan.blockOnBlocked !== false;
  const next = new Set();
  const normalizedAction = String(action || "").trim();

  if (normalizedAction === "all") {
    for (const id of allCandidateIds) {
      if (selectableForImport(id, permanentIds, evaluations, previewStatusById, { allowDraftOnWarning, blockOnBlocked })) {
        next.add(id);
      }
    }
    return next;
  }

  if (normalizedAction === "permanent") {
    for (const id of permanentIds) {
      if (selectableForImport(id, permanentIds, evaluations, previewStatusById, { allowDraftOnWarning, blockOnBlocked })) {
        next.add(id);
      }
    }
    return next;
  }

  for (const id of allCandidateIds) {
    const status = statusForCandidate(id, evaluations, previewStatusById);

    if (normalizedAction === "confirmable") {
      if (!permanentIds.has(id)) {
        next.add(id);
        continue;
      }
      if (status === "blocked") {
        if (!blockOnBlocked) next.add(id);
        continue;
      }
      if (status === "warning") {
        if (allowDraftOnWarning) next.add(id);
        continue;
      }
      next.add(id);
      continue;
    }

    if (normalizedAction === "safe") {
      if (status !== "blocked") next.add(id);
      continue;
    }

    if (normalizedAction === "exclude-risky") {
      if (status !== "warning" && status !== "blocked") next.add(id);
      continue;
    }

    if (normalizedAction === "exclude-warning") {
      if (status !== "warning") next.add(id);
      continue;
    }

    if (normalizedAction === "exclude-blocked") {
      if (status !== "blocked") next.add(id);
      continue;
    }
  }

  return next;
}

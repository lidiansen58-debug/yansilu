import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { buildExternalCandidates } from "../../connectors/src/index.mjs";
import { writePermanentNoteIfAbsent } from "../../domain/src/index.mjs";
import { originalityGuard } from "../../originality-guard/src/index.mjs";
import {
  buildPermanentCandidateFromPaperTranslation,
  literatureRecordForPaperCandidate
} from "./permanent-candidate-builder.mjs";

const CANDIDATE_STATUSES = new Set(["new", "selected", "skipped", "translated", "converted", "saved"]);

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value) {
  return String(value || "").trim();
}

function hashId(prefix, input) {
  const hash = createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function generatedId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function assertPaperId(id) {
  const paperId = cleanText(id);
  if (!paperId) {
    const error = new Error("paperId is required");
    error.code = "PAPER_WORKSPACE_ID_REQUIRED";
    throw error;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(paperId)) {
    const error = new Error("paperId can only contain letters, numbers, underscores, and dashes");
    error.code = "PAPER_WORKSPACE_ID_INVALID";
    throw error;
  }
  return paperId;
}

function workspaceDir(vaultPath, paperId) {
  const root = path.resolve(vaultPath, "papers");
  const dir = path.resolve(root, assertPaperId(paperId));
  const rel = path.relative(root, dir);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    const error = new Error("paper workspace path escapes papers root");
    error.code = "PAPER_WORKSPACE_PATH_INVALID";
    throw error;
  }
  return dir;
}

export function paperWorkspacePath(vaultPath, paperId) {
  return path.join(workspaceDir(vaultPath, paperId), "workspace.json");
}

async function readWorkspaceFile(vaultPath, paperId) {
  try {
    return JSON.parse(await fs.readFile(paperWorkspacePath(vaultPath, paperId), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeWorkspaceFile(vaultPath, workspace) {
  const filePath = paperWorkspacePath(vaultPath, workspace.paperId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(workspace, null, 2), "utf8");
  return workspace;
}

function normalizeWorkspace(value = {}) {
  return {
    paperId: cleanText(value.paperId),
    sourceId: cleanText(value.sourceId),
    title: cleanText(value.title),
    stage: cleanText(value.stage) || "candidates",
    candidates: Array.isArray(value.candidates) ? value.candidates : [],
    translations: Array.isArray(value.translations) ? value.translations : [],
    permanentCandidates: Array.isArray(value.permanentCandidates) ? value.permanentCandidates : [],
    notebookLmDrafts: Array.isArray(value.notebookLmDrafts) ? value.notebookLmDrafts : [],
    createdAt: cleanText(value.createdAt) || nowIso(),
    updatedAt: cleanText(value.updatedAt) || cleanText(value.createdAt) || nowIso()
  };
}

function normalizeNotebookCandidate({ draftId, item, index, createdAt }) {
  const quoteText = cleanText(item.quote_text || item.content || item.text || item.summary || item.answer);
  const externalCandidateId = cleanText(item.id) || `candidate_${index + 1}`;
  return {
    id: hashId("pwc", `${draftId}:${externalCandidateId}:${quoteText}`),
    externalCandidateId,
    sourceId: cleanText(item.source_id),
    title: cleanText(item.title) || `NotebookLM candidate ${index + 1}`,
    quoteText,
    paraphraseText: cleanText(item.paraphrase_text),
    notebook: cleanText(item.notebook),
    notebookInputType: cleanText(item.notebook_input_type),
    candidateKind: cleanText(item.candidate_kind) || "claim",
    locator: item.locator || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    status: "new",
    createdAt,
    updatedAt: createdAt
  };
}

function findCandidate(workspace, candidateId) {
  return workspace.candidates.find((item) => item.id === candidateId || item.externalCandidateId === candidateId) || null;
}

function findPermanentCandidate(workspace, candidateId) {
  const id = cleanText(candidateId);
  return workspace.permanentCandidates.find((item) => item.id === id || item.paper_candidate_id === id) || null;
}

function nextWorkspaceStage(workspace) {
  if (workspace.permanentCandidates.some((item) => cleanText(item.savedPermanentNoteId))) return "saved";
  if (workspace.permanentCandidates.length) return "permanent_candidates";
  if (workspace.translations.length) return "translations";
  return "candidates";
}

function assertAuthorshipConfirmed(input = {}) {
  if (input.confirmAuthorship === true || input.authorshipConfirmed === true || input.authorship_confirmed === true) return;
  const error = new Error("explicit authorship confirmation is required before saving a permanent note");
  error.code = "PAPER_PERMANENT_NOTE_AUTHORSHIP_REQUIRED";
  throw error;
}

function statusForConfirmedPermanentNote(input = {}, candidate = {}) {
  const requested = cleanText(input.status || candidate.status || "draft") || "draft";
  if (requested === "active" && candidate.originality_status !== "pass") return "draft";
  return requested;
}

function permanentNoteForWrite(candidate = {}, input = {}, updatedAt = nowIso()) {
  return {
    id: cleanText(candidate.id),
    title: cleanText(input.title || candidate.title),
    core_claim: cleanText(input.coreClaim || input.core_claim || candidate.core_claim),
    rationale: cleanText(input.rationale || candidate.rationale),
    boundary_or_counterpoint: cleanText(input.boundaryOrCounterpoint || input.boundary_or_counterpoint || candidate.boundary_or_counterpoint),
    citations: Array.isArray(candidate.citations) ? candidate.citations : [],
    from_literature_note_ids: Array.isArray(candidate.from_literature_note_ids) ? candidate.from_literature_note_ids : [],
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    authorship: {
      ...(candidate.authorship || {}),
      user_confirmed: true,
      ai_assisted: candidate.authorship?.ai_assisted === true
    },
    originality_status: cleanText(candidate.originality_status) || "warning",
    status: statusForConfirmedPermanentNote(input, candidate),
    created_at: cleanText(candidate.created_at) || updatedAt,
    updated_at: updatedAt
  };
}

export async function createPaperWorkspace(vaultPath, input = {}) {
  const createdAt = nowIso();
  const paperId = assertPaperId(input.paperId || input.id || generatedId("paper"));
  const existing = await readWorkspaceFile(vaultPath, paperId);
  if (existing) {
    const error = new Error("paper workspace already exists");
    error.code = "PAPER_WORKSPACE_EXISTS";
    throw error;
  }

  const workspace = normalizeWorkspace({
    paperId,
    sourceId: cleanText(input.sourceId || input.source_id),
    title: cleanText(input.title) || "Untitled paper",
    stage: "candidates",
    createdAt,
    updatedAt: createdAt
  });

  return writeWorkspaceFile(vaultPath, workspace);
}

export async function getPaperWorkspace(vaultPath, paperId) {
  const workspace = await readWorkspaceFile(vaultPath, paperId);
  return workspace ? normalizeWorkspace(workspace) : null;
}

export async function addNotebookLmDraft(vaultPath, paperId, payload = {}) {
  const workspace = await getPaperWorkspace(vaultPath, paperId);
  if (!workspace) {
    const error = new Error("paper workspace not found");
    error.code = "PAPER_WORKSPACE_NOT_FOUND";
    throw error;
  }

  const createdAt = nowIso();
  const draftId = cleanText(payload.draftId || payload.draft_id) || generatedId("nbd");
  const built = buildExternalCandidates("notebooklm", payload);
  const candidates = built.literature.map((item, index) => normalizeNotebookCandidate({ draftId, item, index, createdAt }));
  const existingIds = new Set(workspace.candidates.map((item) => item.id));
  const addedCandidates = candidates.filter((item) => !existingIds.has(item.id));

  workspace.candidates.push(...addedCandidates);
  workspace.notebookLmDrafts.push({
    id: draftId,
    notebook: cleanText(payload.notebookName || payload.notebook || "NotebookLM"),
    payload,
    candidateIds: addedCandidates.map((item) => item.id),
    warningCodes: built.warnings.map((item) => item.code),
    createdAt
  });
  workspace.stage = nextWorkspaceStage(workspace);
  workspace.updatedAt = createdAt;

  await writeWorkspaceFile(vaultPath, workspace);
  return { workspace, draftId, candidates: addedCandidates, warnings: built.warnings };
}

export async function updatePaperCandidateStatus(vaultPath, paperId, input = {}) {
  const workspace = await getPaperWorkspace(vaultPath, paperId);
  if (!workspace) {
    const error = new Error("paper workspace not found");
    error.code = "PAPER_WORKSPACE_NOT_FOUND";
    throw error;
  }

  const candidateId = cleanText(input.candidateId || input.candidate_id || input.id);
  const status = cleanText(input.status);
  if (!CANDIDATE_STATUSES.has(status)) {
    const error = new Error("candidate status is invalid");
    error.code = "PAPER_CANDIDATE_STATUS_INVALID";
    throw error;
  }

  const candidate = findCandidate(workspace, candidateId);
  if (!candidate) {
    const error = new Error("paper candidate not found");
    error.code = "PAPER_CANDIDATE_NOT_FOUND";
    throw error;
  }

  const updatedAt = nowIso();
  candidate.status = status;
  candidate.updatedAt = updatedAt;
  workspace.stage = nextWorkspaceStage(workspace);
  workspace.updatedAt = updatedAt;

  await writeWorkspaceFile(vaultPath, workspace);
  return { workspace, candidate };
}

export async function savePaperTranslation(vaultPath, paperId, input = {}) {
  const workspace = await getPaperWorkspace(vaultPath, paperId);
  if (!workspace) {
    const error = new Error("paper workspace not found");
    error.code = "PAPER_WORKSPACE_NOT_FOUND";
    throw error;
  }

  const candidateId = cleanText(input.candidateId || input.candidate_id);
  const paraphraseText = cleanText(input.paraphraseText || input.paraphrase_text);
  if (!paraphraseText) {
    const error = new Error("paraphraseText is required before a paper candidate can move forward");
    error.code = "PAPER_TRANSLATION_PARAPHRASE_REQUIRED";
    throw error;
  }

  const candidate = findCandidate(workspace, candidateId);
  if (!candidate) {
    const error = new Error("paper candidate not found");
    error.code = "PAPER_CANDIDATE_NOT_FOUND";
    throw error;
  }

  const updatedAt = nowIso();
  const existing = workspace.translations.find((item) => item.candidateId === candidate.id) || null;
  const translation = {
    id: existing?.id || cleanText(input.id) || generatedId("ptr"),
    candidateId: candidate.id,
    paraphraseText,
    relationToQuestion: cleanText(input.relationToQuestion || input.relation_to_question),
    boundaryOrCondition: cleanText(input.boundaryOrCondition || input.boundary_or_condition),
    status: "ready",
    createdAt: existing?.createdAt || updatedAt,
    updatedAt
  };

  if (existing) {
    Object.assign(existing, translation);
  } else {
    workspace.translations.push(translation);
  }

  candidate.paraphraseText = paraphraseText;
  candidate.status = "translated";
  candidate.updatedAt = updatedAt;
  workspace.stage = nextWorkspaceStage(workspace);
  workspace.updatedAt = updatedAt;

  await writeWorkspaceFile(vaultPath, workspace);
  return { workspace, translation, candidate };
}

export async function createPaperPermanentCandidate(vaultPath, paperId, input = {}) {
  const workspace = await getPaperWorkspace(vaultPath, paperId);
  if (!workspace) {
    const error = new Error("paper workspace not found");
    error.code = "PAPER_WORKSPACE_NOT_FOUND";
    throw error;
  }

  const permanentCandidate = buildPermanentCandidateFromPaperTranslation(workspace, input);
  const sourceCandidate = findCandidate(workspace, permanentCandidate.paper_candidate_id);
  const guard = originalityGuard(
    {
      literature: [literatureRecordForPaperCandidate(sourceCandidate, workspace)],
      permanent: [permanentCandidate]
    },
    input.originalityPlan || input.originality_plan || {}
  );
  const evaluation = guard.evaluations.find((item) => item.permanentId === permanentCandidate.id);
  permanentCandidate.originality_status = evaluation?.status || permanentCandidate.originality_status;
  permanentCandidate.updated_at = nowIso();

  const existingIndex = workspace.permanentCandidates.findIndex((item) => item.id === permanentCandidate.id);
  if (existingIndex >= 0) {
    workspace.permanentCandidates[existingIndex] = {
      ...workspace.permanentCandidates[existingIndex],
      ...permanentCandidate,
      created_at: workspace.permanentCandidates[existingIndex].created_at || permanentCandidate.created_at
    };
  } else {
    workspace.permanentCandidates.push(permanentCandidate);
  }

  if (sourceCandidate) {
    sourceCandidate.status = "converted";
    sourceCandidate.updatedAt = permanentCandidate.updated_at;
  }
  workspace.stage = nextWorkspaceStage(workspace);
  workspace.updatedAt = permanentCandidate.updated_at;

  await writeWorkspaceFile(vaultPath, workspace);
  return { workspace, permanentCandidate, originalityGuard: guard, evaluation: evaluation || null };
}

export async function savePaperPermanentNote(vaultPath, paperId, input = {}) {
  const workspace = await getPaperWorkspace(vaultPath, paperId);
  if (!workspace) {
    const error = new Error("paper workspace not found");
    error.code = "PAPER_WORKSPACE_NOT_FOUND";
    throw error;
  }

  assertAuthorshipConfirmed(input);

  const permanentCandidateId = cleanText(input.permanentCandidateId || input.permanent_candidate_id || input.candidateId || input.candidate_id || input.id);
  const permanentCandidate = findPermanentCandidate(workspace, permanentCandidateId);
  if (!permanentCandidate) {
    const error = new Error("paper permanent candidate not found");
    error.code = "PAPER_PERMANENT_CANDIDATE_NOT_FOUND";
    throw error;
  }
  if (permanentCandidate.originality_status === "blocked") {
    const error = new Error("blocked permanent candidates cannot be saved");
    error.code = "PAPER_PERMANENT_NOTE_ORIGINALITY_BLOCKED";
    throw error;
  }
  if (cleanText(permanentCandidate.savedPermanentNoteId)) {
    const error = new Error("paper permanent candidate has already been saved");
    error.code = "PAPER_PERMANENT_NOTE_ALREADY_SAVED";
    throw error;
  }

  const updatedAt = nowIso();
  const permanentNote = permanentNoteForWrite(permanentCandidate, input, updatedAt);
  const writeResult = await writePermanentNoteIfAbsent(vaultPath, permanentNote);
  if (!writeResult.written) {
    const error = new Error("permanent note already exists");
    error.code = "PAPER_PERMANENT_NOTE_EXISTS";
    error.writeResult = writeResult;
    throw error;
  }

  permanentCandidate.authorship = permanentNote.authorship;
  permanentCandidate.status = permanentNote.status;
  permanentCandidate.savedPermanentNoteId = permanentNote.id;
  permanentCandidate.savedAt = updatedAt;
  permanentCandidate.updated_at = updatedAt;

  const sourceCandidate = findCandidate(workspace, permanentCandidate.paper_candidate_id);
  if (sourceCandidate) {
    sourceCandidate.status = "saved";
    sourceCandidate.updatedAt = updatedAt;
  }

  workspace.stage = nextWorkspaceStage(workspace);
  workspace.updatedAt = updatedAt;

  await writeWorkspaceFile(vaultPath, workspace);
  return { workspace, permanentCandidate, permanentNote, writeResult };
}

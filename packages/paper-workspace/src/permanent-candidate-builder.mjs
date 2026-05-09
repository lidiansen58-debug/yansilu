import { createHash } from "node:crypto";

function cleanText(value) {
  return String(value || "").trim();
}

function stableId(prefix, input) {
  const hash = createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function excerpt(value, max = 180) {
  const text = cleanText(value).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function firstSentence(value, max = 180) {
  const text = cleanText(value).replace(/\s+/g, " ");
  const match = text.match(/^(.+?[.!?\u3002\uff01\uff1f])(?:\s|$)/);
  return excerpt(match?.[1] || text, max);
}

function titleFromClaim(value) {
  return firstSentence(value, 72).replace(/[.!?\u3002\uff01\uff1f]+$/g, "") || "Permanent note candidate";
}

function uniqueTags(values = []) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

export function buildPermanentCandidateFromPaperTranslation(workspace = {}, input = {}) {
  const candidateId = cleanText(input.candidateId || input.candidate_id);
  const candidate = (Array.isArray(workspace.candidates) ? workspace.candidates : []).find(
    (item) => item.id === candidateId || item.externalCandidateId === candidateId
  );
  if (!candidate) {
    const error = new Error("paper candidate not found");
    error.code = "PAPER_CANDIDATE_NOT_FOUND";
    throw error;
  }

  const translation = (Array.isArray(workspace.translations) ? workspace.translations : []).find(
    (item) => item.candidateId === candidate.id
  );
  const paraphraseText = cleanText(input.paraphraseText || input.paraphrase_text || translation?.paraphraseText);
  if (!paraphraseText) {
    const error = new Error("user paraphrase is required before generating a permanent note candidate");
    error.code = "PAPER_PERMANENT_CANDIDATE_PARAPHRASE_REQUIRED";
    throw error;
  }

  const createdAt = cleanText(input.createdAt || input.created_at) || new Date().toISOString();
  const sourceId = cleanText(candidate.sourceId || workspace.sourceId || "unknown");
  const literatureId = cleanText(candidate.externalCandidateId || candidate.id);
  const coreClaim = firstSentence(paraphraseText);
  const relationToQuestion = cleanText(input.relationToQuestion || input.relation_to_question || translation?.relationToQuestion);
  const boundaryOrCondition = cleanText(input.boundaryOrCondition || input.boundary_or_condition || translation?.boundaryOrCondition);

  return {
    id: cleanText(input.id) || stableId("pn", `${workspace.paperId}:${candidate.id}`),
    title: cleanText(input.title) || titleFromClaim(coreClaim || paraphraseText),
    core_claim: coreClaim,
    rationale: relationToQuestion || paraphraseText,
    boundary_or_counterpoint: boundaryOrCondition,
    citations: [
      {
        source_id: sourceId,
        locator: cleanText(candidate.locator),
        quote_excerpt: excerpt(candidate.quoteText)
      }
    ],
    from_literature_note_ids: literatureId ? [literatureId] : [],
    tags: uniqueTags([...(Array.isArray(candidate.tags) ? candidate.tags : []), "paper-workspace"]),
    authorship: { user_confirmed: false, ai_assisted: false },
    originality_status: "warning",
    status: "draft",
    created_at: createdAt,
    updated_at: createdAt,
    paper_workspace_id: cleanText(workspace.paperId),
    paper_candidate_id: candidate.id,
    translation_id: cleanText(translation?.id)
  };
}

export function literatureRecordForPaperCandidate(candidate = {}, workspace = {}) {
  return {
    id: cleanText(candidate.externalCandidateId || candidate.id),
    source_id: cleanText(candidate.sourceId || workspace.sourceId || "unknown"),
    title: cleanText(candidate.title),
    quote_text: cleanText(candidate.quoteText),
    locator: cleanText(candidate.locator),
    tags: Array.isArray(candidate.tags) ? candidate.tags : []
  };
}

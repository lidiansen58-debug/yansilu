import { createHash } from "node:crypto";

export const POTENTIAL_RELATION_ALGORITHM_VERSION = "potential_relation_v1";
export const DEFAULT_POTENTIAL_RELATION_MODEL = "qwen2.5:7b";
const POTENTIAL_RELATION_NETWORK_STATUSES = new Set(["suggested", "draft", "confirmed"]);

const BROAD_TAGS = new Set(["永久笔记", "原创笔记", "卡片笔记法", "关键笔记", "知识点主线"]);
const CONTRAST_PATTERN = /反驳|反例|矛盾|冲突|张力|不是.+而是|相反|contradict|conflict|tension|counterexample|not.+but/iu;

function cleanText(value = "") {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function compactText(value = "") {
  return cleanText(value).replace(/\s+/g, " ");
}

function stringItems(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => cleanText(value)).filter(Boolean))];
}

function stableHash(value = "") {
  return createHash("sha1").update(String(value || "")).digest("hex");
}

function stableId(prefix = "item", parts = []) {
  const raw = parts.map((part) => cleanText(part)).filter(Boolean).join(":");
  return `${prefix}_${stableHash(raw).slice(0, 16)}`;
}

function sortedUniqueStrings(values = []) {
  return uniqueStrings(values).sort((left, right) => left.localeCompare(right));
}

function parseMarkdownTags(markdown = "") {
  return [...String(markdown || "").matchAll(/(^|[\s([{])#([\p{L}\p{N}_/-]+)/gu)]
    .map((match) => cleanText(match[2]))
    .filter(Boolean);
}

function stripMarkdown(value = "") {
  return cleanText(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(text = "", maxLength = 160) {
  const compact = compactText(text);
  if (!compact) return "";
  const boundary = compact.search(/[。！？!?]\s*/u);
  const sentence = boundary >= 8 ? compact.slice(0, boundary + 1) : compact;
  return sentence.length > maxLength ? sentence.slice(0, maxLength - 1).trim() : sentence;
}

function markdownSection(markdown = "", headings = []) {
  const names = (Array.isArray(headings) ? headings : [headings]).map((item) => cleanText(item)).filter(Boolean);
  if (!names.length) return "";
  const lines = cleanText(markdown).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    const level = match[1].length;
    const title = cleanText(match[2]).replace(/[：:]\s*$/, "");
    if (!names.some((name) => title === name || title.includes(name))) continue;
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextHeading = lines[cursor].match(/^(#{1,6})\s+/);
      if (nextHeading && nextHeading[1].length <= level) break;
      body.push(lines[cursor]);
    }
    return stripMarkdown(body.join("\n"));
  }
  return "";
}

function normalizeNote(input = {}) {
  const body = cleanText(input.body || input.markdown || input.markdownBody || input.markdown_body);
  const noteId = cleanText(input.noteId || input.note_id || input.id);
  const title = cleanText(input.title) || firstSentence(body.replace(/^#\s+/, ""), 80) || noteId;
  const sectionThesis = markdownSection(body, ["一句话论点", "中心判断"]);
  const sectionSummary = markdownSection(body, ["三句话压缩", "摘要"]);
  const thesis = cleanText(input.thesis || input.coreClaim || input.core_claim || sectionThesis);
  const summaryItems = stringItems(input.threeLineSummary || input.three_line_summary || input.summaryLines || input.summary_lines);
  const summary = cleanText(input.summary || input.threeLineSummaryText || summaryItems.join("\n") || sectionSummary);
  const tags = uniqueStrings([
    ...(Array.isArray(input.tags) ? input.tags : []),
    ...(Array.isArray(input.tagNames) ? input.tagNames : []),
    ...parseMarkdownTags(body)
  ]);
  return {
    raw: input,
    noteId,
    title,
    thesis,
    summary,
    tags,
    body,
    markdownPath: cleanText(input.markdownPath || input.markdown_path || input.path || input.filePath || input.file_path),
    folderId: cleanText(input.folderId || input.folder_id || input.directoryId || input.directory_id),
    updatedAt: cleanText(input.updatedAt || input.updated_at || input.modifiedAt || input.modified_at)
  };
}

function normalizeRelation(input = {}) {
  return {
    id: cleanText(input.id || input.relationId || input.relation_id),
    fromNoteId: cleanText(input.fromNoteId || input.from_note_id || input.from || input.sourceNoteId || input.source_note_id),
    toNoteId: cleanText(input.toNoteId || input.to_note_id || input.to || input.targetNoteId || input.target_note_id),
    relationType: cleanText(input.relationType || input.relation_type || input.type) || "associated_with",
    status: cleanText(input.status) || "confirmed"
  };
}

export function isPotentialRelationNetworkStatus(status = "") {
  return POTENTIAL_RELATION_NETWORK_STATUSES.has(cleanText(status || "confirmed").toLowerCase());
}

function undirectedPairKey(left = "", right = "") {
  const ids = [cleanText(left), cleanText(right)].sort((a, b) => a.localeCompare(b));
  return `${ids[0]}::${ids[1]}`;
}

export function buildPermanentNoteFingerprint(note = {}, relations = []) {
  const normalized = normalizeNote(note);
  const outgoingRelationIds = [];
  const incomingRelationIds = [];
  for (const relation of (Array.isArray(relations) ? relations : []).map(normalizeRelation)) {
    if (relation.fromNoteId === normalized.noteId) outgoingRelationIds.push(relation.id || undirectedPairKey(relation.fromNoteId, relation.toNoteId));
    if (relation.toNoteId === normalized.noteId) incomingRelationIds.push(relation.id || undirectedPairKey(relation.fromNoteId, relation.toNoteId));
  }
  const contentHash = stableHash(
    JSON.stringify({
      title: normalized.title,
      thesis: normalized.thesis,
      summary: normalized.summary,
      tags: normalized.tags,
      body: normalized.body,
      markdownPath: normalized.markdownPath,
      folderId: normalized.folderId
    })
  );
  return {
    noteId: normalized.noteId,
    title: normalized.title,
    thesis: normalized.thesis,
    summary: normalized.summary,
    tags: normalized.tags,
    markdownPath: normalized.markdownPath,
    folderId: normalized.folderId,
    outgoingRelationIds: outgoingRelationIds.sort(),
    incomingRelationIds: incomingRelationIds.sort(),
    contentHash,
    updatedAt: normalized.updatedAt
  };
}

function tokenBigrams(text = "") {
  const normalized = compactText(text).toLowerCase();
  const cjk = [...normalized.matchAll(/\p{Script=Han}/gu)].map((match) => match[0]);
  if (cjk.length >= 2) {
    return cjk.slice(0, -1).map((char, index) => `${char}${cjk[index + 1]}`);
  }
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
  if (tokens.length >= 2) return tokens.slice(0, -1).map((token, index) => `${token} ${tokens[index + 1]}`);
  const chars = [...normalized.replace(/\s+/g, "")];
  return chars.length >= 2 ? chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`) : chars;
}

function jaccard(left = [], right = []) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function titleSimilarity(left = "", right = "") {
  return Number(jaccard(tokenBigrams(left), tokenBigrams(right)).toFixed(4));
}

function claimSimilarity(left = "", right = "") {
  return Number(jaccard(tokenBigrams(left), tokenBigrams(right)).toFixed(4));
}

function relationGraphStats(fingerprints = [], relations = []) {
  const ids = new Set(fingerprints.map((fingerprint) => fingerprint.noteId).filter(Boolean));
  const neighbors = new Map([...ids].map((id) => [id, new Set()]));
  const relationPairKeys = new Set();
  for (const relation of (Array.isArray(relations) ? relations : []).map(normalizeRelation)) {
    if (!ids.has(relation.fromNoteId) || !ids.has(relation.toNoteId)) continue;
    if (!isPotentialRelationNetworkStatus(relation.status)) continue;
    relationPairKeys.add(undirectedPairKey(relation.fromNoteId, relation.toNoteId));
    neighbors.get(relation.fromNoteId)?.add(relation.toNoteId);
    neighbors.get(relation.toNoteId)?.add(relation.fromNoteId);
  }
  const degree = new Map([...ids].map((id) => [id, neighbors.get(id)?.size || 0]));
  const hubThreshold = Math.max(3, Math.ceil(Math.sqrt(Math.max(1, ids.size)) / 2));
  return { neighbors, degree, relationPairKeys, hubThreshold };
}

function buildTagStats(fingerprints = []) {
  const df = new Map();
  for (const fingerprint of fingerprints) {
    for (const tag of new Set(fingerprint.tags || [])) {
      if (!tag || BROAD_TAGS.has(tag)) continue;
      df.set(tag, (df.get(tag) || 0) + 1);
    }
  }
  const total = fingerprints.length;
  return { df, total };
}

function sharedSpecificTags(left = {}, right = []) {
  const rightTags = new Set(right.tags || []);
  return (left.tags || []).filter((tag) => tag && !BROAD_TAGS.has(tag) && rightTags.has(tag));
}

function coarseTypeFor({ sharedTags = [], claimScore = 0, titleScore = 0, isolatedToHubScore = 0, combinedText = "" } = {}) {
  if (CONTRAST_PATTERN.test(combinedText) && (claimScore >= 0.22 || titleScore >= 0.22 || sharedTags.length > 0)) return "contradicts";
  if (isolatedToHubScore > 0) return "bridges";
  if (sharedTags.length >= 2) return "same_topic";
  if (claimScore >= 0.28) return "associated_with";
  return sharedTags.length ? "same_topic" : "associated_with";
}

function candidatePriority(candidate = {}, left = {}, right = {}, stats = {}, options = {}) {
  const currentNoteId = cleanText(options.currentNoteId || options.current_note_id);
  const recentIds = new Set(stringItems(options.recentNoteIds || options.recent_note_ids));
  const leftDegree = stats.degree.get(left.noteId) || 0;
  const rightDegree = stats.degree.get(right.noteId) || 0;
  let priority = 0;
  if (leftDegree === 0 || rightDegree === 0) priority += 50;
  if (recentIds.has(left.noteId) || recentIds.has(right.noteId)) priority += 18;
  if ((left.thesis && leftDegree === 0) || (right.thesis && rightDegree === 0)) priority += 12;
  if (currentNoteId && (left.noteId === currentNoteId || right.noteId === currentNoteId)) priority += 20;
  if (candidate.isolatedToHubScore > 0) priority += 10;
  return priority;
}

function scorePair(left = {}, right = {}, tagStats = {}, stats = {}) {
  const sharedTags = sharedSpecificTags(left, right);
  const specificTagScore = sharedTags.reduce((sum, tag) => sum + Math.log((tagStats.total + 1) / ((tagStats.df.get(tag) || 0) + 1)), 0);
  const titleScore = titleSimilarity(left.title, right.title);
  const claimScore = claimSimilarity(`${left.thesis}\n${left.summary}`, `${right.thesis}\n${right.summary}`);
  const leftNeighbors = stats.neighbors.get(left.noteId) || new Set();
  const rightNeighbors = stats.neighbors.get(right.noteId) || new Set();
  const sharedNeighbors = [...leftNeighbors].filter((id) => rightNeighbors.has(id));
  const sharedNeighborScore = Math.min(1, sharedNeighbors.length / 2);
  const leftDegree = stats.degree.get(left.noteId) || 0;
  const rightDegree = stats.degree.get(right.noteId) || 0;
  const isolatedToHubScore =
    (leftDegree === 0 && rightDegree >= stats.hubThreshold) || (rightDegree === 0 && leftDegree >= stats.hubThreshold)
      ? 1
      : 0;
  const sameFolderScore = left.folderId && left.folderId === right.folderId ? 1 : 0;
  const score =
    specificTagScore * 3 +
    titleScore * 4 +
    claimScore * 7 +
    sharedNeighborScore * 2 +
    isolatedToHubScore * 1.5 +
    sameFolderScore * 0.5;
  const coarseType = coarseTypeFor({
    sharedTags,
    claimScore,
    titleScore,
    isolatedToHubScore,
    combinedText: `${left.title}\n${left.thesis}\n${left.summary}\n${right.title}\n${right.thesis}\n${right.summary}`
  });
  const reasons = [
    sharedTags.length ? `共享标签：${sharedTags.slice(0, 4).map((tag) => `#${tag}`).join("、")}` : "",
    titleScore >= 0.18 ? "标题概念接近" : "",
    claimScore >= 0.18 ? "中心判断/摘要相近" : "",
    sharedNeighbors.length ? `已有共同邻居 ${sharedNeighbors.length} 个` : "",
    isolatedToHubScore ? "孤立节点连接 hub" : "",
    sameFolderScore ? "同一目录线索" : ""
  ].filter(Boolean);
  return {
    score: Number(score.toFixed(4)),
    hasPrimarySignal: Boolean(sharedTags.length || titleScore >= 0.18 || claimScore >= 0.18 || sharedNeighborScore > 0 || isolatedToHubScore > 0),
    specificTagScore: Number(specificTagScore.toFixed(4)),
    titleSimilarity: titleScore,
    claimSimilarity: claimScore,
    sharedNeighborScore,
    isolatedToHubScore,
    sameFolderScore,
    sharedTags,
    coarseType,
    coarseReasons: reasons.length ? reasons : ["弱本地线索，需人工复核"]
  };
}

function preferredSource(left = {}, right = {}, stats = {}, options = {}) {
  const currentNoteId = cleanText(options.currentNoteId || options.current_note_id);
  if (currentNoteId === left.noteId) return [left, right];
  if (currentNoteId === right.noteId) return [right, left];
  const leftDegree = stats.degree.get(left.noteId) || 0;
  const rightDegree = stats.degree.get(right.noteId) || 0;
  if (leftDegree === 0 && rightDegree !== 0) return [left, right];
  if (rightDegree === 0 && leftDegree !== 0) return [right, left];
  return [left, right];
}

export function buildPotentialRelationCandidates(input = {}) {
  const startedAt = performance.now();
  const notes = (Array.isArray(input.notes) ? input.notes : []).map(normalizeNote).filter((note) => note.noteId);
  const relations = (Array.isArray(input.relations) ? input.relations : []).map(normalizeRelation).filter((relation) => relation.fromNoteId && relation.toNoteId);
  const fingerprints = notes.map((note) => buildPermanentNoteFingerprint(note, relations));
  const stats = relationGraphStats(fingerprints, relations);
  const tagStats = buildTagStats(fingerprints);
  const options = input.options || {};
  const minScoreInput = Number(
    options.minScore ??
      options.min_score ??
      options.minRelationScore ??
      options.min_relation_score ??
      options.minRelationConfidence ??
      options.min_relation_confidence
  );
  const minScore = Number.isFinite(minScoreInput) ? minScoreInput : 0.8;
  const perNoteLimit = Math.max(1, Math.min(Number(options.perNoteLimit ?? options.per_note_limit) || 5, 10));
  const globalLimit = Math.max(1, Math.min(Number(options.globalLimit ?? options.global_limit) || 80, 200));
  const focusNoteId = cleanText(options.focusNoteId || options.focus_note_id || options.currentNoteId || options.current_note_id);
  const focusMode = Boolean(focusNoteId);
  const allCandidates = [];

  for (let leftIndex = 0; leftIndex < fingerprints.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fingerprints.length; rightIndex += 1) {
      const left = fingerprints[leftIndex];
      const right = fingerprints[rightIndex];
      if (!left.noteId || !right.noteId || left.noteId === right.noteId) continue;
      if (focusMode && left.noteId !== focusNoteId && right.noteId !== focusNoteId) continue;
      if (stats.relationPairKeys.has(undirectedPairKey(left.noteId, right.noteId))) continue;
      const pairScore = scorePair(left, right, tagStats, stats);
      if (!pairScore.hasPrimarySignal) continue;
      if (pairScore.score < minScore) continue;
      const [source, target] = preferredSource(left, right, stats, options);
      const priority = candidatePriority(pairScore, source, target, stats, options);
      const id = stableId("prc", [source.noteId, source.contentHash, target.noteId, target.contentHash, POTENTIAL_RELATION_ALGORITHM_VERSION]);
      allCandidates.push({
        id,
        sourceNoteId: source.noteId,
        targetNoteId: target.noteId,
        fromNoteId: source.noteId,
        toNoteId: target.noteId,
        sourceTitle: source.title,
        targetTitle: target.title,
        coarseScore: pairScore.score,
        confidence: Math.min(0.95, Number((pairScore.score / 10).toFixed(4))),
        coarseReasons: pairScore.coarseReasons,
        coarseType: pairScore.coarseType,
        relationType: pairScore.coarseType,
        sharedTags: pairScore.sharedTags,
        specificTagScore: pairScore.specificTagScore,
        titleSimilarity: pairScore.titleSimilarity,
        claimSimilarity: pairScore.claimSimilarity,
        sharedNeighborScore: pairScore.sharedNeighborScore,
        isolatedToHubScore: pairScore.isolatedToHubScore,
        sameFolderScore: pairScore.sameFolderScore,
        componentBridge: pairScore.coarseType === "bridges" || pairScore.isolatedToHubScore > 0,
        rationale: pairScore.coarseReasons.join("；"),
        evidence: [
          { noteId: source.noteId, summary: firstSentence(source.thesis || source.summary || source.title, 90) },
          { noteId: target.noteId, summary: firstSentence(target.thesis || target.summary || target.title, 90) }
        ],
        aiDecision: null,
        aiRelationType: null,
        aiConfidence: null,
        aiRationale: "",
        evidenceA: "",
        evidenceB: "",
        reviewQuestion: `这两条笔记是否存在明确论证动作，而不只是同主题？`,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelName: "",
        algorithmVersion: POTENTIAL_RELATION_ALGORITHM_VERSION,
        sourceContentHash: source.contentHash,
        targetContentHash: target.contentHash,
        priority,
        queueScore: Number((priority + pairScore.score).toFixed(4)),
        suggestedAction: "review_potential_relation"
      });
    }
  }

  const byNote = new Map();
  const perNoteLimited = [];
  for (const candidate of allCandidates.sort((a, b) => b.queueScore - a.queueScore || b.coarseScore - a.coarseScore)) {
    const sourceCount = byNote.get(candidate.sourceNoteId) || 0;
    const targetCount = byNote.get(candidate.targetNoteId) || 0;
    if (sourceCount >= perNoteLimit || targetCount >= perNoteLimit) continue;
    byNote.set(candidate.sourceNoteId, sourceCount + 1);
    byNote.set(candidate.targetNoteId, targetCount + 1);
    perNoteLimited.push(candidate);
  }
  const candidates = perNoteLimited
    .sort((a, b) => b.queueScore - a.queueScore || b.coarseScore - a.coarseScore)
    .slice(0, globalLimit);
  const elapsedMs = Number((performance.now() - startedAt).toFixed(2));
  return {
    algorithmVersion: POTENTIAL_RELATION_ALGORITHM_VERSION,
    mode: focusMode ? "focus_note" : "directory_batch",
    focusNoteId,
    fingerprints,
    candidates,
    metrics: {
      noteCount: fingerprints.length,
      relationCount: relations.length,
      rawCandidateCount: allCandidates.length,
      candidateCount: candidates.length,
      elapsedMs
    }
  };
}

export function potentialRelationCacheKey(candidate = {}, options = {}) {
  const promptSemanticKey = [
    cleanText(candidate.coarseType || candidate.coarse_type || candidate.relationType || candidate.relation_type || "associated_with"),
    ...sortedUniqueStrings(candidate.sharedTags || candidate.shared_tags || [])
  ].join("|");
  return [
    cleanText(candidate.sourceNoteId || candidate.fromNoteId),
    cleanText(candidate.sourceContentHash),
    cleanText(candidate.targetNoteId || candidate.toNoteId),
    cleanText(candidate.targetContentHash),
    cleanText(options.algorithmVersion || candidate.algorithmVersion || POTENTIAL_RELATION_ALGORITHM_VERSION),
    cleanText(options.providerId || candidate.providerId || candidate.provider_id),
    cleanText(options.privacyMode || candidate.privacyMode || candidate.privacy_mode),
    cleanText(options.userMode || candidate.userMode || candidate.user_mode),
    cleanText(options.modelName || candidate.modelName || DEFAULT_POTENTIAL_RELATION_MODEL),
    promptSemanticKey,
    options.confirmationApproved === true || options.confirmBudget === true ? "confirmed_budget" : "awaiting_budget"
  ].join(":");
}

export class PotentialRelationAiCache {
  constructor(entries = []) {
    this.items = new Map(entries);
  }
  get(key) {
    return this.items.get(key) || null;
  }
  set(key, value) {
    this.items.set(key, value);
    return value;
  }
}

export function buildPotentialRelationAiPrompt(candidate = {}, fingerprintsById = new Map()) {
  const source = fingerprintsById.get(cleanText(candidate.sourceNoteId || candidate.fromNoteId)) || {};
  const target = fingerprintsById.get(cleanText(candidate.targetNoteId || candidate.toNoteId)) || {};
  return [
    "你是永久笔记潜在关联的严格审查器。目标是减少乱连线。",
    "只有当两条笔记存在明确论证动作时才 accept：A 支持 B、反驳 B、限定 B、作为桥接中间概念。",
    "如果只是主题接近，decision=uncertain, relationType=same_topic。",
    "如果说不清具体动作，decision=reject, relationType=no_relation。",
    "不要把“讨论不同侧面”说成 contradicts。返回严格 JSON。",
    "",
    `A title: ${source.title || candidate.sourceTitle || ""}`,
    `A thesis/summary: ${compactText(source.thesis || source.summary || "").slice(0, 420)}`,
    `B title: ${target.title || candidate.targetTitle || ""}`,
    `B thesis/summary: ${compactText(target.thesis || target.summary || "").slice(0, 420)}`,
    `coarseType: ${candidate.coarseType || candidate.relationType || "associated_with"}`,
    `sharedTags: ${(candidate.sharedTags || []).join(", ")}`,
    "",
    'JSON: {"decision":"accept|reject|uncertain","relationType":"supports|contradicts|qualifies|bridges|same_topic|associated_with|no_relation","confidence":0.0,"rationale":"一句中文理由","evidenceA":"A 中的证据短句","evidenceB":"B 中的证据短句","reviewQuestion":"给用户复核的问题"}'
  ].join("\n");
}

export function parsePotentialRelationAiJson(text = "") {
  const raw = cleanText(text);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI_RELATION_JSON_NOT_FOUND");
  const parsed = JSON.parse(match[0]);
  const decision = cleanText(parsed.decision).toLowerCase();
  const relationType = cleanText(parsed.relationType || parsed.relation_type).toLowerCase();
  if (!["accept", "reject", "uncertain"].includes(decision)) throw new Error("AI_RELATION_DECISION_INVALID");
  if (!["supports", "contradicts", "qualifies", "bridges", "same_topic", "associated_with", "no_relation"].includes(relationType)) {
    throw new Error("AI_RELATION_TYPE_INVALID");
  }
  return {
    decision,
    relationType,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))),
    rationale: cleanText(parsed.rationale).slice(0, 220),
    evidenceA: cleanText(parsed.evidenceA || parsed.evidence_a).slice(0, 160),
    evidenceB: cleanText(parsed.evidenceB || parsed.evidence_b).slice(0, 160),
    reviewQuestion: cleanText(parsed.reviewQuestion || parsed.review_question).slice(0, 180)
  };
}

function withTimeout(promise, timeoutMs = 60000) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`AI_RELATION_TIMEOUT_${timeoutMs}`);
        error.code = "AI_RELATION_TIMEOUT";
        reject(error);
      }, timeoutMs);
    })
  ]);
}

export async function refinePotentialRelationCandidateWithLocalAi(candidate = {}, options = {}) {
  const startedAt = performance.now();
  const modelName = cleanText(options.modelName) || DEFAULT_POTENTIAL_RELATION_MODEL;
  const cache = options.cache || new PotentialRelationAiCache();
  const cacheKey = potentialRelationCacheKey(candidate, {
    modelName,
    providerId: options.providerId,
    privacyMode: options.privacyMode,
    userMode: options.userMode,
    confirmationApproved: options.confirmationApproved,
    confirmBudget: options.confirmBudget
  });
  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      ...candidate,
      ...cached,
      cacheHit: true,
      aiElapsedMs: Number((performance.now() - startedAt).toFixed(2))
    };
  }
  const fingerprintsById = options.fingerprintsById instanceof Map
    ? options.fingerprintsById
    : new Map((Array.isArray(options.fingerprints) ? options.fingerprints : []).map((fingerprint) => [fingerprint.noteId, fingerprint]));
  const prompt = buildPotentialRelationAiPrompt(candidate, fingerprintsById);
  const callModel = options.callModel;
  if (typeof callModel !== "function") throw new Error("AI_RELATION_MODEL_CALL_REQUIRED");
  try {
    const raw = await withTimeout(
      Promise.resolve(callModel(prompt, {
        modelName,
        temperature: Number(options.temperature ?? 0.1),
        numPredict: Number(options.numPredict ?? options.num_predict ?? 320),
        timeoutMs: Number(options.timeoutMs ?? options.timeout_ms ?? 60000)
      })),
      Number(options.timeoutMs || options.timeout_ms || 60000)
    );
    const outputText = typeof raw === "string" ? raw : raw?.response || raw?.text || raw?.content || "";
    const parsed = parsePotentialRelationAiJson(outputText);
    const value = {
      aiDecision: parsed.decision,
      aiRelationType: parsed.relationType,
      aiConfidence: parsed.confidence,
      aiRationale: parsed.rationale,
      evidenceA: parsed.evidenceA,
      evidenceB: parsed.evidenceB,
      reviewQuestion: parsed.reviewQuestion || candidate.reviewQuestion,
      modelName,
      updatedAt: new Date().toISOString(),
      aiFailedAt: "",
      aiError: "",
      aiErrorCode: "",
      aiNeedsConfirmation: false
    };
    cache.set(cacheKey, value);
    return {
      ...candidate,
      ...value,
      cacheHit: false,
      aiElapsedMs: Number((performance.now() - startedAt).toFixed(2))
    };
  } catch (error) {
    const errorCode = cleanText(error?.code || error?.cause?.code);
    const needsConfirmation = errorCode === "AI_ROUTE_CONFIRMATION_REQUIRED" || errorCode === "AI_BUDGET_CONFIRMATION_REQUIRED";
    const value = {
      aiDecision: candidate.aiDecision || null,
      aiRelationType: candidate.aiRelationType || null,
      aiConfidence: candidate.aiConfidence || null,
      modelName,
      aiFailedAt: new Date().toISOString(),
      aiError: cleanText(error?.message || error),
      aiErrorCode: errorCode,
      aiNeedsConfirmation: needsConfirmation,
      updatedAt: new Date().toISOString()
    };
    return {
      ...candidate,
      ...value,
      cacheHit: false,
      aiElapsedMs: Number((performance.now() - startedAt).toFixed(2))
    };
  }
}

export function potentialRelationCandidateToDraftRelation(candidate = {}) {
  const decision = cleanText(candidate.aiDecision).toLowerCase();
  const relationType = cleanText(candidate.aiRelationType || candidate.relationType || candidate.coarseType);
  if (decision === "reject" || relationType === "no_relation") return null;
  return {
    fromNoteId: cleanText(candidate.sourceNoteId || candidate.fromNoteId),
    toNoteId: cleanText(candidate.targetNoteId || candidate.toNoteId),
    relationType,
    rationale: cleanText(candidate.aiRationale || candidate.rationale),
    status: "pending_review",
    source: "potential_relation_candidate",
    candidateId: cleanText(candidate.id)
  };
}

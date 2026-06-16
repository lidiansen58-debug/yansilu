import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPotentialRelationCandidates,
  buildPermanentNoteFingerprint,
  PotentialRelationAiCache,
  potentialRelationCacheKey,
  potentialRelationCandidateToDraftRelation,
  refinePotentialRelationCandidateWithLocalAi
} from "../../packages/ai-orchestrator/src/potential-relations.mjs";

function note(id, title, body, extra = {}) {
  return {
    id,
    title,
    body,
    folderId: extra.folderId || "dir_original_default",
    thesis: extra.thesis || "",
    summary: extra.summary || "",
    tags: extra.tags || [],
    updatedAt: extra.updatedAt || "2026-06-16T00:00:00.000Z"
  };
}

test("potential relation scan ignores broad tags as a dominant signal", () => {
  const notes = [
    note("a", "A", "# A\n\n#永久笔记 only broad tag."),
    note("b", "B", "# B\n\n#永久笔记 another broad tag."),
    note("c", "C", "# C\n\n#具体标签 same narrow idea.", { tags: ["具体标签"] }),
    note("d", "D", "# D\n\n#具体标签 same narrow idea.", { tags: ["具体标签"] })
  ];

  const scan = buildPotentialRelationCandidates({ notes, relations: [], options: { minScore: 0.1, globalLimit: 10 } });
  const broadPair = scan.candidates.find((candidate) => new Set([candidate.sourceNoteId, candidate.targetNoteId]).has("a") && new Set([candidate.sourceNoteId, candidate.targetNoteId]).has("b"));
  const specificPair = scan.candidates.find((candidate) => new Set([candidate.sourceNoteId, candidate.targetNoteId]).has("c") && new Set([candidate.sourceNoteId, candidate.targetNoteId]).has("d"));

  assert.equal(broadPair, undefined);
  assert.ok(specificPair);
  assert.match(specificPair.coarseReasons.join(" "), /具体标签/);
});

test("specific tag IDF lifts rare shared tags above common tags", () => {
  const notes = [
    note("rare1", "Rare One", "# Rare One", { tags: ["稀有概念"] }),
    note("rare2", "Rare Two", "# Rare Two", { tags: ["稀有概念"] }),
    note("common1", "Common One", "# Common One", { tags: ["常见主题"] }),
    note("common2", "Common Two", "# Common Two", { tags: ["常见主题"] }),
    note("common3", "Common Three", "# Common Three", { tags: ["常见主题"] }),
    note("common4", "Common Four", "# Common Four", { tags: ["常见主题"] })
  ];

  const scan = buildPotentialRelationCandidates({ notes, relations: [], options: { minScore: 0.1, globalLimit: 20 } });
  const rarePair = scan.candidates.find((candidate) => candidate.sharedTags.includes("稀有概念"));
  const commonPair = scan.candidates.find((candidate) => candidate.sharedTags.includes("常见主题"));

  assert.ok(rarePair);
  assert.ok(commonPair);
  assert.ok(rarePair.specificTagScore > commonPair.specificTagScore);
  assert.ok(rarePair.coarseScore > commonPair.coarseScore);
});

test("existing confirmed relations are not recommended again", () => {
  const notes = [
    note("a", "Local AI relation", "# A\n\n## 一句话论点\nAI relation needs review. #AI"),
    note("b", "Local AI review", "# B\n\n## 一句话论点\nAI relation needs review. #AI")
  ];
  const relations = [{ id: "r1", fromNoteId: "a", toNoteId: "b", relationType: "same_topic", status: "confirmed" }];

  const scan = buildPotentialRelationCandidates({ notes, relations, options: { minScore: 0.1 } });

  assert.equal(scan.candidates.length, 0);
});

test("pending or suggested relations can still return to the review queue", () => {
  const notes = [
    note("a", "Manual relation candidate", "# A\n\n## Thesis\nManual relation review needs a human decision. #manual-link"),
    note("b", "Manual relation review", "# B\n\n## Thesis\nManual relation review needs a human decision. #manual-link")
  ];
  const relations = [{ id: "r1", fromNoteId: "a", toNoteId: "b", relationType: "same_topic", status: "pending_review" }];

  const scan = buildPotentialRelationCandidates({ notes, relations, options: { minScore: 0.1 } });

  assert.equal(scan.candidates.length, 1);
  assert.equal(new Set([scan.candidates[0].sourceNoteId, scan.candidates[0].targetNoteId]).has("a"), true);
  assert.equal(new Set([scan.candidates[0].sourceNoteId, scan.candidates[0].targetNoteId]).has("b"), true);
});

test("draft relations are treated as existing network edges and are not recommended again", () => {
  const notes = [
    note("a", "Draft relation source", "# A\n\n## Thesis\nDraft relation review still lives in the graph. #manual-link"),
    note("b", "Draft relation target", "# B\n\n## Thesis\nDraft relation review still lives in the graph. #manual-link")
  ];
  const relations = [{ id: "r1", fromNoteId: "a", toNoteId: "b", relationType: "same_topic", status: "draft" }];

  const scan = buildPotentialRelationCandidates({ notes, relations, options: { minScore: 0.1 } });

  assert.equal(scan.candidates.length, 0);
});

test("suggested relations are treated as existing network edges and are not recommended again", () => {
  const notes = [
    note("a", "Suggested relation source", "# A\n\n## Thesis\nSuggested relation review still lives in the graph. #manual-link"),
    note("b", "Suggested relation target", "# B\n\n## Thesis\nSuggested relation review still lives in the graph. #manual-link")
  ];
  const relations = [{ id: "r1", fromNoteId: "a", toNoteId: "b", relationType: "same_topic", status: "suggested" }];

  const scan = buildPotentialRelationCandidates({ notes, relations, options: { minScore: 0.1 } });

  assert.equal(scan.candidates.length, 0);
});

test("dismissed or archived relations do not suppress future candidate discovery", () => {
  const notes = [
    note("a", "Dismissed relation source", "# A\n\n## Thesis\nA dismissed link should not block a fresh review. #manual-link"),
    note("b", "Dismissed relation target", "# B\n\n## Thesis\nA dismissed link should not block a fresh review. #manual-link")
  ];

  for (const status of ["dismissed", "archived"]) {
    const scan = buildPotentialRelationCandidates({
      notes,
      relations: [{ id: `r_${status}`, fromNoteId: "a", toNoteId: "b", relationType: "same_topic", status }],
      options: { minScore: 0.1 }
    });

    assert.equal(scan.candidates.length, 1);
    assert.equal(new Set([scan.candidates[0].sourceNoteId, scan.candidates[0].targetNoteId]).has("a"), true);
    assert.equal(new Set([scan.candidates[0].sourceNoteId, scan.candidates[0].targetNoteId]).has("b"), true);
  }
});

test("per-note candidate count is limited to Top K", () => {
  const notes = [
    note("center", "中心判断", "# Center\n\n## 一句话论点\n关系图谱需要人工确认。 #图谱"),
    ...Array.from({ length: 5 }, (_, index) =>
      note(`n${index}`, `候选 ${index}`, `# 候选 ${index}\n\n## 一句话论点\n关系图谱需要人工确认。 #图谱`)
    )
  ];

  const scan = buildPotentialRelationCandidates({ notes, relations: [], options: { minScore: 0.1, perNoteLimit: 2, globalLimit: 20 } });
  const centerCount = scan.candidates.filter((candidate) => candidate.sourceNoteId === "center" || candidate.targetNoteId === "center").length;

  assert.ok(centerCount <= 2);
});

test("isolated permanent notes are prioritized into the candidate queue", () => {
  const notes = [
    note("hub", "图谱 hub", "# Hub\n\n## 一句话论点\n关联网络需要一个中心。 #图谱"),
    note("n1", "hub neighbor 1", "# N1\n\n#图谱"),
    note("n2", "hub neighbor 2", "# N2\n\n#图谱"),
    note("n3", "hub neighbor 3", "# N3\n\n#图谱"),
    note("isolated", "孤立图谱笔记", "# Isolated\n\n## 一句话论点\n关联网络需要一个中心。 #图谱")
  ];
  const relations = [
    { id: "r1", fromNoteId: "hub", toNoteId: "n1", status: "confirmed" },
    { id: "r2", fromNoteId: "hub", toNoteId: "n2", status: "confirmed" },
    { id: "r3", fromNoteId: "hub", toNoteId: "n3", status: "confirmed" }
  ];

  const scan = buildPotentialRelationCandidates({ notes, relations, options: { minScore: 0.1, globalLimit: 5 } });

  assert.equal(scan.candidates[0].sourceNoteId, "isolated");
  assert.equal(scan.candidates[0].targetNoteId, "hub");
  assert.equal(scan.candidates[0].coarseType, "bridges");
});

test("per-note limiting still keeps higher-priority isolated-to-hub candidates", () => {
  const notes = [
    note("hub", "Hub", "# Hub", { thesis: "network center", tags: ["hubtag"] }),
    note("n1", "Hub neighbor 1", "# N1", { tags: ["hubtag"] }),
    note("n2", "Hub neighbor 2", "# N2", { tags: ["hubtag"] }),
    note("n3", "Hub neighbor 3", "# N3", { tags: ["hubtag"] }),
    note("isolated", "Isolated", "# Isolated", { thesis: "foo bar baz", tags: ["hubtag", "rare"] }),
    note("other", "Other", "# Other", { thesis: "foo bar baz", tags: ["rare"] })
  ];
  const relations = [
    { id: "r1", fromNoteId: "hub", toNoteId: "n1", status: "confirmed" },
    { id: "r2", fromNoteId: "hub", toNoteId: "n2", status: "confirmed" },
    { id: "r3", fromNoteId: "hub", toNoteId: "n3", status: "confirmed" }
  ];

  const scan = buildPotentialRelationCandidates({
    notes,
    relations,
    options: { minScore: 0.1, perNoteLimit: 1, globalLimit: 10 }
  });

  assert.equal(scan.candidates[0].sourceNoteId, "isolated");
  assert.equal(scan.candidates[0].targetNoteId, "hub");
  assert.equal(scan.candidates[0].coarseType, "bridges");
});

test("focus note mode only returns candidates around the selected isolated note", () => {
  const notes = [
    note("focus", "孤立 AI 笔记", "# Focus\n\n## 一句话论点\nAI 候选需要人工确认。 #AI"),
    note("target", "AI 图谱笔记", "# Target\n\n## 一句话论点\nAI 候选需要人工确认。 #AI"),
    note("other1", "写作笔记一", "# Other 1\n\n## 一句话论点\n写作结构需要清晰。 #写作"),
    note("other2", "写作笔记二", "# Other 2\n\n## 一句话论点\n写作结构需要清晰。 #写作")
  ];

  const scan = buildPotentialRelationCandidates({
    notes,
    relations: [],
    options: { minScore: 0.1, focusNoteId: "focus", globalLimit: 10 }
  });

  assert.equal(scan.mode, "focus_note");
  assert.equal(scan.focusNoteId, "focus");
  assert.ok(scan.candidates.length > 0);
  assert.ok(scan.candidates.every((candidate) => candidate.sourceNoteId === "focus" || candidate.targetNoteId === "focus"));
  assert.equal(scan.candidates.some((candidate) => candidate.sourceNoteId === "other1" || candidate.targetNoteId === "other1"), false);
});

test("minRelationConfidence remains a supported alias for the potential relation score threshold", () => {
  const notes = [
    note("a", "Alias threshold A", "# A\n\n#specific-tag useful overlap.", { tags: ["specific-tag"] }),
    note("b", "Alias threshold B", "# B\n\n#specific-tag useful overlap.", { tags: ["specific-tag"] })
  ];

  const defaultScan = buildPotentialRelationCandidates({ notes, relations: [], options: { minScore: 0.1 } });
  const aliasSuppressedScan = buildPotentialRelationCandidates({ notes, relations: [], options: { minRelationConfidence: 10 } });

  assert.ok(defaultScan.candidates.length > 0);
  assert.equal(aliasSuppressedScan.candidates.length, 0);
});

test("AI JSON parse failure preserves the rule candidate", async () => {
  const candidate = {
    id: "c1",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with",
    status: "pending"
  };

  const refined = await refinePotentialRelationCandidateWithLocalAi(candidate, {
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => "not json"
  });

  assert.equal(refined.sourceNoteId, "a");
  assert.equal(refined.targetNoteId, "b");
  assert.equal(refined.status, "pending");
  assert.match(refined.aiError, /JSON|Unexpected|FOUND|INVALID/);
});

test("AI refine failures are not cached, so the same candidate can retry later", async () => {
  const cache = new PotentialRelationAiCache();
  const candidate = {
    id: "c_retry_after_error",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with",
    status: "pending"
  };
  let calls = 0;
  const options = {
    cache,
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => {
      calls += 1;
      return "not json";
    }
  };

  const first = await refinePotentialRelationCandidateWithLocalAi(candidate, options);
  const second = await refinePotentialRelationCandidateWithLocalAi(candidate, options);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, false);
  assert.equal(calls, 2);
  assert.match(second.aiError, /JSON|Unexpected|FOUND|INVALID/);
});

test("confirmation-required refine errors are returned with retry metadata", async () => {
  const candidate = {
    id: "c_confirm",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with",
    status: "pending"
  };

  const refined = await refinePotentialRelationCandidateWithLocalAi(candidate, {
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => {
      const error = new Error("This model route requires confirmation before running.");
      error.code = "AI_ROUTE_CONFIRMATION_REQUIRED";
      throw error;
    }
  });

  assert.equal(refined.aiErrorCode, "AI_ROUTE_CONFIRMATION_REQUIRED");
  assert.equal(refined.aiNeedsConfirmation, true);
});

test("AI cache hit does not call the model again", async () => {
  const cache = new PotentialRelationAiCache();
  const candidate = {
    id: "c1",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with"
  };
  let calls = 0;
  const options = {
    cache,
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => {
      calls += 1;
      return '{"decision":"uncertain","relationType":"same_topic","confidence":0.4,"rationale":"同主题但动作不明确","evidenceA":"A","evidenceB":"B","reviewQuestion":"是否只是同主题？"}';
    }
  };

  const first = await refinePotentialRelationCandidateWithLocalAi(candidate, options);
  const second = await refinePotentialRelationCandidateWithLocalAi(candidate, options);

  assert.equal(calls, 1);
  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.aiRelationType, "same_topic");
});

test("different coarse relation semantics do not reuse a stale AI cache entry", async () => {
  const cache = new PotentialRelationAiCache();
  let calls = 0;
  const options = {
    cache,
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async (prompt) => {
      calls += 1;
      return JSON.stringify({
        decision: "accept",
        relationType: "supports",
        confidence: 0.7,
        rationale: prompt.includes("coarseType: bridges") ? "bridge rationale" : "topic rationale",
        evidenceA: "A",
        evidenceB: "B",
        reviewQuestion: "Q"
      });
    }
  };

  const first = await refinePotentialRelationCandidateWithLocalAi(
    {
      id: "c_same_topic",
      sourceNoteId: "a",
      targetNoteId: "b",
      sourceContentHash: "ha",
      targetContentHash: "hb",
      coarseType: "same_topic",
      relationType: "same_topic",
      sharedTags: ["tag-a"]
    },
    options
  );

  const second = await refinePotentialRelationCandidateWithLocalAi(
    {
      id: "c_bridges",
      sourceNoteId: "a",
      targetNoteId: "b",
      sourceContentHash: "ha",
      targetContentHash: "hb",
      coarseType: "bridges",
      relationType: "bridges",
      sharedTags: ["tag-a"]
    },
    options
  );

  assert.equal(calls, 2);
  assert.equal(first.aiRationale, "topic rationale");
  assert.equal(second.aiRationale, "bridge rationale");
  assert.equal(second.cacheHit, false);
});

test("different providers do not share the same potential relation AI cache entry", () => {
  const candidate = {
    id: "c_provider_split",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with",
    sharedTags: ["tag-a"]
  };

  const localKey = potentialRelationCacheKey(candidate, {
    providerId: "local_private_gateway",
    privacyMode: "local_only",
    userMode: "Local / Private",
    modelName: "shared-runtime-model"
  });
  const remoteKey = potentialRelationCacheKey(candidate, {
    providerId: "openai_compatible_gateway",
    privacyMode: "normal",
    userMode: "Balanced",
    modelName: "shared-runtime-model"
  });

  assert.notEqual(localKey, remoteKey);
});

test("confirmation approval uses a different refine cache key and retries the model", async () => {
  const cache = new PotentialRelationAiCache();
  const candidate = {
    id: "c_retry",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with"
  };
  let calls = 0;
  const options = {
    cache,
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error("This model route requires confirmation before running.");
        error.code = "AI_ROUTE_CONFIRMATION_REQUIRED";
        throw error;
      }
      return '{"decision":"accept","relationType":"supports","confidence":0.6,"rationale":"A supports B.","evidenceA":"A","evidenceB":"B","reviewQuestion":"Does A really support B?"}';
    }
  };

  const first = await refinePotentialRelationCandidateWithLocalAi(candidate, options);
  const second = await refinePotentialRelationCandidateWithLocalAi(candidate, {
    ...options,
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(first.aiNeedsConfirmation, true);
  assert.equal(second.aiRelationType, "supports");
  assert.equal(second.cacheHit, false);
  assert.equal(calls, 2);
});

test("reject/no_relation AI output is not converted into a formal relation draft", async () => {
  const candidate = {
    id: "c1",
    sourceNoteId: "a",
    targetNoteId: "b",
    sourceContentHash: "ha",
    targetContentHash: "hb",
    coarseType: "associated_with",
    relationType: "associated_with"
  };
  const refined = await refinePotentialRelationCandidateWithLocalAi(candidate, {
    fingerprints: [
      buildPermanentNoteFingerprint(note("a", "A", "# A")),
      buildPermanentNoteFingerprint(note("b", "B", "# B"))
    ],
    callModel: async () => '{"decision":"reject","relationType":"no_relation","confidence":0.1,"rationale":"说不清动作","evidenceA":"","evidenceB":"","reviewQuestion":"是否忽略？"}'
  });

  assert.equal(refined.aiDecision, "reject");
  assert.equal(refined.aiRelationType, "no_relation");
  assert.equal(potentialRelationCandidateToDraftRelation(refined), null);
});

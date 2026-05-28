import test from "node:test";
import assert from "node:assert/strict";

const moduleUrl = new URL("../../apps/web/src/prototype-api.js", import.meta.url);
let importCounter = 0;

async function importPrototypeApi(caseName, windowValue) {
  const previousWindow = globalThis.window;
  if (windowValue === undefined) delete globalThis.window;
  else globalThis.window = windowValue;

  try {
    const url = new URL(moduleUrl);
    url.searchParams.set("case", `${caseName}-${++importCounter}`);
    return await import(url.href);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("prototype API falls back when packaged API placeholder is not replaced", async () => {
  const api = await importPrototypeApi("placeholder", { __API_BASE__: "__API_BASE__" });
  assert.equal(api.getApiBase(), "http://localhost:3000");
});

test("prototype API uses injected API base from dev server", async () => {
  const api = await importPrototypeApi("injected", { __API_BASE__: "http://127.0.0.1:3999" });
  assert.equal(api.getApiBase(), "http://127.0.0.1:3999");
});

test("prototype API fetches note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          noteId: "note with space",
          tags: [],
          outgoingLinks: [],
          backlinks: []
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("relations", { __API_BASE__: "http://127.0.0.1:3999" });
    const relations = await api.fetchNoteRelations("note with space");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/note%20with%20space/relations");
    assert.equal(calls[0].options.method, undefined);
    assert.deepEqual(relations, {
      noteId: "note with space",
      tags: [],
      outgoingLinks: [],
      backlinks: []
    });
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API runs permanent note analysis through the note endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          noteId: "pn source",
          analysis: { analysisMode: "local_rule" },
          reviewItems: { storedArtifactIds: ["artifact_1"], artifactsPersisted: true }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("note-analysis-run", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.analyzePermanentNote("pn source", {
      relatedNoteIds: ["pn target"],
      persistArtifacts: true
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/pn%20source/ai-analysis");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      relatedNoteIds: ["pn target"],
      persistArtifacts: true
    });
    assert.equal(result.reviewItems.storedArtifactIds[0], "artifact_1");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API fetches permanent note analysis inbox projection", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          noteId: "pn source",
          view: "pending",
          items: [{ artifactId: "artifact_1", type: "LinkSuggestion" }]
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("note-analysis-fetch", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.fetchPermanentNoteAnalysis("pn source", { view: "pending", limit: 12 });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/pn%20source/ai-analysis?view=pending&limit=12");
    assert.equal(calls[0].options.method, undefined);
    assert.equal(result.items[0].type, "LinkSuggestion");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API runs confirmed writing strong-model analysis through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          request: { requestType: "writing_strong_model_analysis" },
          result: { artifacts: [{ type: "WritingMove", status: "pending_review" }] }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("writing-ai-analysis", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.analyzeWritingWithStrongModel({
      userConfirmedRemoteModel: true,
      writingGoal: "Draft a review-first outline.",
      noteIds: ["pn_1"],
      persistArtifacts: false
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/writing/ai-analysis");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      userConfirmedRemoteModel: true,
      writingGoal: "Draft a review-first outline.",
      noteIds: ["pn_1"],
      persistArtifacts: false
    });
    assert.equal(result.request.requestType, "writing_strong_model_analysis");
    assert.equal(result.result.artifacts[0].type, "WritingMove");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API searches notes through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        rootDirectoryId: "dir_original_default",
        query: "target",
        items: [{ id: "pn_target", title: "Target note", directoryId: "dir_child" }],
        total: 1
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("search-notes", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.searchNotes({
      query: "target",
      rootDirectoryId: "dir_original_default",
      excludeNoteId: "pn_source",
      limit: 30
    });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://127.0.0.1:3999/api/v1/notes/search?q=target&rootDirectoryId=dir_original_default&excludeNoteId=pn_source&limit=30"
    );
    assert.equal(calls[0].options.method, undefined);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, "pn_target");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API fetches relation review queue through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        directoryId: "dir_original_default",
        directoryTitle: "Original",
        includeDescendants: false,
        qualityLevels: ["empty", "basic"],
        relationType: "all",
        status: "all",
        limit: 8,
        items: [{ id: "lnk_weak", reviewReason: "missing_rationale" }],
        summary: { byQualityLevel: { empty: 1 } },
        total: 1
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("relation-review-queue", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.fetchRelationReviewQueue({
      directoryId: "dir_original_default",
      includeDescendants: false,
      qualityLevels: ["empty", "basic"],
      limit: 8
    });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://127.0.0.1:3999/api/v1/relations/review-queue?directoryId=dir_original_default&includeDescendants=false&qualityLevels=empty%2Cbasic&relationType=all&status=all&limit=8"
    );
    assert.equal(calls[0].options.method, undefined);
    assert.equal(result.total, 1);
    assert.equal(result.items[0].id, "lnk_weak");
    assert.equal(result.summary.byQualityLevel.empty, 1);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API fetches directory graph with descendants flag", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          directoryId: "dir_original_default",
          scope: "directory_tree",
          includeDescendants: true,
          nodes: [{ id: "pn_child" }],
          edges: [],
          totalNodes: 1,
          totalEdges: 0
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("directory-graph-descendants", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.fetchDirectoryGraph("dir_original_default", { includeDescendants: true });

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "http://127.0.0.1:3999/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true"
    );
    assert.equal(calls[0].options.method, undefined);
    assert.equal(result.scope, "directory_tree");
    assert.equal(result.includeDescendants, true);
    assert.equal(result.nodes[0].id, "pn_child");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API runs directory graph AI analysis through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          directoryId: "dir_original_default",
          analysis: { analysisMode: "local_graph_rule" },
          reviewItems: { artifacts: [{ type: "LinkSuggestion" }], artifactsPersisted: false }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("graph-ai-analysis", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.analyzeDirectoryGraph("dir_original_default", {
      includeDescendants: true,
      persistArtifacts: false
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/graph/ai-analysis");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      includeDescendants: true,
      persistArtifacts: false,
      directoryId: "dir_original_default"
    });
    assert.equal(result.analysis.analysisMode, "local_graph_rule");
    assert.equal(result.reviewItems.artifacts[0].type, "LinkSuggestion");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API creates note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          id: "lnk_test",
          fromNoteId: "source note",
          toNoteId: "target note",
          relationType: "supports",
          rationale: "A supports B.",
          status: "confirmed"
        }
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("create-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const relation = await api.createNoteRelation("source note", {
      toNoteId: "target note",
      relationType: "supports",
      rationale: "A supports B."
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/notes/source%20note/relations");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      toNoteId: "target note",
      relationType: "supports",
      rationale: "A supports B."
    });
    assert.equal(relation.id, "lnk_test");
    assert.equal(relation.status, "confirmed");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API seeds the Yijing knowledge-network demo through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          kind: "prototype_demo_seed",
          demoOnly: true,
          importLifecycle: "none",
          fixtureId: "yijing-judgment-training",
          directoryId: "dir_demo_yijing_knowledge_network",
          summary: { totalNodes: 16, totalEdges: 20 }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("seed-yijing-network", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.seedYijingKnowledgeNetwork();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/demo/knowledge-network/yijing");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {});
    assert.equal(result.kind, "prototype_demo_seed");
    assert.equal(result.demoOnly, true);
    assert.equal(result.importLifecycle, "none");
    assert.equal(result.directoryId, "dir_demo_yijing_knowledge_network");
    assert.equal(result.summary.totalNodes, 16);
    assert.equal(result.summary.totalEdges, 20);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API seeds the rich Yijing acceptance demo through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          kind: "yijing_rich_acceptance_seed",
          demoOnly: true,
          importLifecycle: "none",
          fixtureId: "yijing-rich-acceptance-v1",
          directoryId: "dir_yijing_rich_acceptance_original",
          counts: { original_notes: 55, relations: 85, writing_projects: 2 }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("seed-yijing-rich-acceptance", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.seedYijingRichAcceptanceDemo();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/demo/acceptance/yijing-rich");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {});
    assert.equal(result.kind, "yijing_rich_acceptance_seed");
    assert.equal(result.demoOnly, true);
    assert.equal(result.importLifecycle, "none");
    assert.equal(result.directoryId, "dir_yijing_rich_acceptance_original");
    assert.equal(result.counts.original_notes, 55);
    assert.equal(result.counts.relations, 85);
    assert.equal(result.counts.writing_projects, 2);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API seeds the smart notes product thinking demo through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          kind: "smart_notes_product_thinking_seed",
          demoOnly: true,
          fixtureId: "demo-smart-notes-product-thinking-v1",
          directoryId: "dir_demo_smart_notes_product_thinking_original",
          firstNoteId: "GUIDE-SN-001",
          writingProjectId: "WP-SN-PM-001",
          draftScaffoldId: "DS-SN-PM-001",
          counts: { sources: 1, permanent_notes: 100, relations: 306, writing_projects: 1 },
          summary: {
            createdSources: 1,
            updatedSources: 0,
            createdNotes: 128,
            updatedNotes: 0,
            createdRelations: 306,
            updatedRelations: 0
          }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("seed-smart-notes-product-thinking", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.seedSmartNotesProductThinkingDemo();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/demo/product-thinking/smart-notes");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), {});
    assert.equal(result.kind, "smart_notes_product_thinking_seed");
    assert.equal(result.demoOnly, true);
    assert.equal(result.directoryId, "dir_demo_smart_notes_product_thinking_original");
    assert.equal(result.firstNoteId, "GUIDE-SN-001");
    assert.equal(result.writingProjectId, "WP-SN-PM-001");
    assert.equal(result.draftScaffoldId, "DS-SN-PM-001");
    assert.equal(result.counts.sources, 1);
    assert.equal(result.counts.permanent_notes, 100);
    assert.equal(result.counts.relations, 306);
    assert.equal(result.counts.writing_projects, 1);
    assert.equal(result.summary.createdSources, 1);
    assert.equal(result.summary.updatedSources, 0);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API updates note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          id: "lnk test",
          relationType: "qualifies",
          rationale: "Updated rationale.",
          status: "draft"
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const api = await importPrototypeApi("update-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const relation = await api.updateNoteRelation("lnk test", {
      relationType: "qualifies",
      rationale: "Updated rationale.",
      status: "draft"
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/relations/lnk%20test");
    assert.equal(calls[0].options.method, "PATCH");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      relationType: "qualifies",
      rationale: "Updated rationale.",
      status: "draft"
    });
    assert.equal(relation.relationType, "qualifies");
    assert.equal(relation.status, "draft");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API deletes note relations through the public endpoint", async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ deleted: true, relationId: "lnk test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const api = await importPrototypeApi("delete-relation", { __API_BASE__: "http://127.0.0.1:3999" });
    const result = await api.deleteNoteRelation("lnk test");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/relations/lnk%20test");
    assert.equal(calls[0].options.method, "DELETE");
    assert.deepEqual(result, { deleted: true, relationId: "lnk test" });
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API fetches AI inbox evaluation summary with filters", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-evaluation-summary", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedUrl = "";
  globalThis.fetch = async (url) => {
    capturedUrl = String(url);
    return {
      ok: true,
      async json() {
        return { item: { artifacts: { total: 1 }, feedback: { all: { useful: 1 } } } };
      }
    };
  };

  try {
    const item = await api.fetchAiInboxEvaluationSummary({
      view: "reviewed",
      type: "ReflectionPrompt",
      sourceNoteId: "note_1",
      privacyMode: "local_only"
    });
    const url = new URL(capturedUrl);
    assert.equal(url.origin, "http://127.0.0.1:3999");
    assert.equal(url.pathname, "/api/v1/ai/inbox/evaluation-summary");
    assert.equal(url.searchParams.get("view"), "reviewed");
    assert.equal(url.searchParams.get("type"), "ReflectionPrompt");
    assert.equal(url.searchParams.get("sourceNoteId"), "note_1");
    assert.equal(url.searchParams.get("privacyMode"), "local_only");
    assert.equal(item.feedback.all.useful, 1);
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API fetches Ollama local runtime models", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ollama-models", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          runtimeId: "ollama",
          status: "available",
          baseUrl: "http://127.0.0.1:11434",
          chatEndpointUrl: "http://127.0.0.1:11434/v1/chat/completions",
          healthEndpointUrl: "http://127.0.0.1:11434/api/tags",
          models: [{ name: "qwen2.5:3b", parameterSize: "3B" }]
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const runtime = await api.fetchOllamaModels();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/ai/local-runtimes/ollama/models");
    assert.equal(calls[0].options.method, undefined);
    assert.equal(runtime.runtimeId, "ollama");
    assert.equal(runtime.status, "available");
    assert.equal(runtime.models[0].name, "qwen2.5:3b");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API pulls an Ollama local runtime model", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ollama-pull-model", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        item: {
          runtimeId: "ollama",
          model: "qwen2.5:7b",
          status: "success",
          runtime: {
            models: [{ name: "qwen2.5:7b" }]
          }
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const result = await api.pullOllamaModel("qwen2.5:7b");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/ai/local-runtimes/ollama/pull-model");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), { model: "qwen2.5:7b" });
    assert.equal(result.status, "success");
    assert.equal(result.runtime.models[0].name, "qwen2.5:7b");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API forces accept-link confirmation", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-accept-link", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedBody = "";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://127.0.0.1:3999/api/v1/ai/inbox/artifact_1/accept-link");
    capturedBody = options.body;
    return {
      ok: true,
      async json() {
        return { item: { artifactId: "artifact_1" } };
      }
    };
  };

  try {
    await api.acceptAiInboxLink("artifact_1", { confirm: false, comment: "Promote this relation." });
    assert.equal(JSON.parse(capturedBody).confirm, true);
    assert.equal(JSON.parse(capturedBody).comment, "Promote this relation.");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API forces promote-note confirmation", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-inbox-promote-note", { __API_BASE__: "http://127.0.0.1:3999" });
  let capturedBody = "";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "http://127.0.0.1:3999/api/v1/ai/inbox/artifact_2/promote-note");
    capturedBody = options.body;
    return {
      ok: true,
      async json() {
        return { item: { artifactId: "artifact_2" }, note: { id: "note_1" } };
      }
    };
  };

  try {
    await api.promoteAiInboxNote("artifact_2", { confirm: false, comment: "Make a draft." });
    assert.equal(JSON.parse(capturedBody).confirm, true);
    assert.equal(JSON.parse(capturedBody).comment, "Make a draft.");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API manages scheduled tasks", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("ai-scheduled-tasks", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/status")) {
      return {
        ok: true,
        async json() {
          return { item: { scheduledTaskId: "sched_1", status: "paused" } };
        }
      };
    }
    if (String(url).endsWith("/run-due")) {
      return {
        ok: true,
        async json() {
          return { item: { total: 1, succeeded: 1 } };
        }
      };
    }
    if (String(url).includes("/scheduled-task-templates")) {
      return {
        ok: true,
        async json() {
          return { items: [{ templateId: "reflection_reminder" }], total: 1 };
        }
      };
    }
    if (options.method === "POST" && String(url).endsWith("/scheduled-tasks")) {
      return {
        ok: true,
        async json() {
          return { item: { scheduledTaskId: "sched_created", status: "paused" } };
        }
      };
    }
    if (options.method === "DELETE") {
      return {
        ok: true,
        async json() {
          return { ok: true, deleted: true };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return { items: [{ scheduledTaskId: "sched_1" }], total: 1 };
      }
    };
  };

  try {
    const listed = await api.fetchAiScheduledTasks({ status: "active", taskType: "reflection_prompt", limit: 250 });
    assert.equal(listed.total, 1);
    const listUrl = new URL(calls[0].url);
    assert.equal(listUrl.pathname, "/api/v1/ai/scheduled-tasks");
    assert.equal(listUrl.searchParams.get("status"), "active");
    assert.equal(listUrl.searchParams.get("taskType"), "reflection_prompt");
    assert.equal(listUrl.searchParams.get("limit"), "100");

    const updated = await api.updateAiScheduledTaskStatus("sched_1", "paused");
    assert.equal(updated.status, "paused");
    assert.equal(calls[1].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/sched_1/status");
    assert.equal(JSON.parse(calls[1].options.body).status, "paused");

    const due = await api.runDueAiScheduledTasks({ limit: 500 });
    assert.equal(due.succeeded, 1);
    assert.equal(calls[2].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/run-due");
    assert.equal(JSON.parse(calls[2].options.body).limit, 100);

    const templates = await api.fetchAiScheduledTaskTemplates({ implementationReady: true });
    assert.equal(templates.items[0].templateId, "reflection_reminder");
    const templateUrl = new URL(calls[3].url);
    assert.equal(templateUrl.pathname, "/api/v1/ai/scheduled-task-templates");
    assert.equal(templateUrl.searchParams.get("implementationReady"), "true");

    const saved = await api.saveAiScheduledTask({ templateId: "reflection_reminder", status: "paused" });
    assert.equal(saved.scheduledTaskId, "sched_created");
    assert.equal(calls[4].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks");
    assert.equal(JSON.parse(calls[4].options.body).templateId, "reflection_reminder");

    const deleted = await api.deleteAiScheduledTask("sched_created");
    assert.equal(deleted.deleted, true);
    assert.equal(calls[5].url, "http://127.0.0.1:3999/api/v1/ai/scheduled-tasks/sched_created");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API exportMarkdown can include directory scope", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("export-markdown-directory", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      async json() {
        return { exportJobId: "exp_1", status: "queued", copied: 3 };
      }
    };
  };

  try {
    const result = await api.exportMarkdown({
      targetPath: "E:\\exports",
      directoryId: "dir_original_default"
    });
    assert.equal(result.exportJobId, "exp_1");
    assert.equal(calls[0].url, "http://127.0.0.1:3999/api/v1/exports/markdown");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      targetPath: "E:\\exports",
      directoryId: "dir_original_default"
    });
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API can request canonical AI inbox and scheduled-task payloads", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("canonical-ai-api", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/ai/inbox/") && String(url).includes("/decision")) {
      return {
        ok: true,
        async json() {
          return {
            item: { artifactId: "artifact_1", status: "accepted" },
            canonical: {
              item: { artifact_id: "artifact_1", status: "accepted" },
              artifact: { id: "artifact_1" },
              latestDecision: { subject_kind: "artifact", event_type: "accepted" }
            }
          };
        }
      };
    }
    if (String(url).includes("/ai/scheduled-tasks/") && String(url).includes("/status")) {
      return {
        ok: true,
        async json() {
          return {
            item: { scheduledTaskId: "sched_1", status: "paused" },
            canonical: { item: { scheduled_task_id: "sched_1", status: "paused" } }
          };
        }
      };
    }
    if (String(url).includes("/ai/inbox?")) {
      return {
        ok: true,
        async json() {
          return {
            items: [{ artifactId: "artifact_1" }],
            total: 1,
            counts: { pending: 1 },
            views: ["pending"],
            canonical: {
              items: [{ artifact_id: "artifact_1" }]
            }
          };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return {
          items: [{ scheduledTaskId: "sched_1" }],
          total: 1,
          canonical: {
            items: [{ scheduled_task_id: "sched_1" }]
          }
        };
      }
    };
  };

  try {
    const inbox = await api.fetchAiInbox({ canonical: true });
    assert.equal(inbox.items[0].artifactId, "artifact_1");
    assert.equal(inbox.canonical.items[0].artifact_id, "artifact_1");
    assert.equal(new URL(calls[0].url).searchParams.get("canonical"), "true");

    const decision = await api.recordAiInboxDecision("artifact_1", { action: "accept", canonical: true });
    assert.equal(decision.item.artifactId, "artifact_1");
    assert.equal(decision.canonical.item.artifact_id, "artifact_1");
    assert.equal(decision.canonical.latestDecision.event_type, "accepted");
    assert.equal(new URL(calls[1].url).searchParams.get("canonical"), "true");

    const tasks = await api.fetchAiScheduledTasks({ canonical: true });
    assert.equal(tasks.items[0].scheduledTaskId, "sched_1");
    assert.equal(tasks.canonical.items[0].scheduled_task_id, "sched_1");
    assert.equal(new URL(calls[2].url).searchParams.get("canonical"), "true");

    const updated = await api.updateAiScheduledTaskStatusWithOptions("sched_1", "paused", { canonical: true });
    assert.equal(updated.scheduledTaskId, "sched_1");
    assert.equal(updated.canonical.item.scheduled_task_id, "sched_1");
    assert.equal(new URL(calls[3].url).searchParams.get("canonical"), "true");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

test("prototype API can manage canonical AI suggestions payloads", async () => {
  const previousFetch = globalThis.fetch;
  const api = await importPrototypeApi("canonical-ai-suggestions-api", { __API_BASE__: "http://127.0.0.1:3999" });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === "POST") {
      return {
        ok: true,
        async json() {
          return {
            item: { id: "suggestion_1", status: "suggested" },
            canonical: {
              item: {
                id: "suggestion_1",
                status: "suggested",
                target: { type: "permanent_note", id: "pn_1", field: "thesis" }
              }
            }
          };
        }
      };
    }
    if (options.method === "PATCH") {
      return {
        ok: true,
        async json() {
          return {
            item: { id: "suggestion_1", status: "adopted_as_draft" },
            canonical: {
              item: {
                id: "suggestion_1",
                status: "adopted_as_draft",
                history: [{ to_status: "adopted_as_draft" }]
              }
            }
          };
        }
      };
    }
    if (String(url).includes("/ai-suggestions/")) {
      return {
        ok: true,
        async json() {
          return {
            item: { id: "suggestion_1", status: "adopted_as_draft" },
            canonical: {
              item: {
                id: "suggestion_1",
                status: "adopted_as_draft"
              }
            }
          };
        }
      };
    }
    return {
      ok: true,
      async json() {
        return {
          items: [{ id: "suggestion_1", status: "suggested" }],
          total: 1,
          canonical: {
            items: [{
              id: "suggestion_1",
              status: "suggested",
              target: { type: "permanent_note", id: "pn_1", field: "thesis" },
              scope: "note_field",
              content: "A reviewable claim starts life as a draft.",
              origin: "ai_generated",
              created_at: "2026-05-18T12:00:00.000Z",
              updated_at: "2026-05-18T12:00:00.000Z",
              provenance: {
                content_origin: "ai_generated",
                human_confirmed: false,
                human_edited: false
              },
              history: []
            }]
          }
        };
      }
    };
  };

  try {
    const listed = await api.fetchAiSuggestions({
      canonical: true,
      status: "suggested",
      targetType: "permanent_note",
      targetId: "pn_1",
      scope: "note_field"
    });
    assert.equal(listed.items[0].id, "suggestion_1");
    assert.equal(listed.canonical.items[0].id, "suggestion_1");
    assert.equal(listed.items[0].target.type, "permanent_note");
    const listUrl = new URL(calls[0].url);
    assert.equal(listUrl.pathname, "/api/v1/ai-suggestions");
    assert.equal(listUrl.searchParams.get("canonical"), "true");
    assert.equal(listUrl.searchParams.get("status"), "suggested");
    assert.equal(listUrl.searchParams.get("targetType"), "permanent_note");
    assert.equal(listUrl.searchParams.get("targetId"), "pn_1");
    assert.equal(listUrl.searchParams.get("scope"), "note_field");

    const created = await api.createAiSuggestion({
      canonical: true,
      target: { type: "permanent_note", id: "pn_1", field: "thesis" },
      scope: "note_field",
      content: "A reviewable claim starts life as a draft."
    });
    assert.equal(created.id, "suggestion_1");
    assert.equal(created.target.field, "thesis");
    assert.equal(created.canonical.item.target.field, "thesis");
    assert.equal(new URL(calls[1].url).searchParams.get("canonical"), "true");

    const fetched = await api.fetchAiSuggestion("suggestion_1", { canonical: true });
    assert.equal(fetched.id, "suggestion_1");
    assert.equal(fetched.canonical.item.status, "adopted_as_draft");
    assert.equal(new URL(calls[2].url).searchParams.get("canonical"), "true");

    const updated = await api.updateAiSuggestion("suggestion_1", {
      canonical: true,
      status: "adopted_as_draft",
      action: "adopt_as_draft",
      actor: "user",
      userId: "user_1"
    });
    assert.equal(updated.status, "adopted_as_draft");
    assert.equal(updated.history[0].toStatus, "adopted_as_draft");
    assert.equal(updated.canonical.item.history[0].to_status, "adopted_as_draft");
    assert.equal(new URL(calls[3].url).searchParams.get("canonical"), "true");
  } finally {
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
});

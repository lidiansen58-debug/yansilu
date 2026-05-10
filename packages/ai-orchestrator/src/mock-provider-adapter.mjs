import { normalizeProviderDescriptor, normalizeModelResponse } from "./provider-adapter.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function defaultArtifactForRequest(request = {}) {
  const artifactType = cleanText(request.expectedArtifactType) || "ReflectionPrompt";
  const firstContextItem = request.contextPack?.items?.[0] || {};
  const secondContextItem = request.contextPack?.items?.[1] || {};
  if (artifactType === "LinkSuggestion") {
    const fromId = firstContextItem.sourceId || "note_a";
    const toId = secondContextItem.sourceId || "mock_related_note";
    return {
      type: "LinkSuggestion",
      title: "Possible related note",
      summary: "Mock link suggestion created by the AI orchestrator harness.",
      body: "This is a mock link suggestion. It is not a final graph edge.",
      payload: {
        from: { id: fromId, kind: "note" },
        to: { id: toId, kind: "note" },
        relationType: "related",
        rationale: secondContextItem.sourceId
          ? "Mock provider generated a candidate relation between two context notes."
          : "Mock provider generated a candidate relation.",
        evidence: [
          {
            sourceId: fromId,
            summary: firstContextItem.title || "First context note"
          },
          ...(secondContextItem.sourceId
            ? [
                {
                  sourceId: toId,
                  summary: secondContextItem.title || "Second context note"
                }
              ]
            : [])
        ],
        suggestedAction: "create_link"
      }
    };
  }

  return {
    type: "ReflectionPrompt",
    title: "A question worth revisiting",
    summary: "Mock reflection prompt created by the AI orchestrator harness.",
    body: "What assumption in this note would be most useful to test next?",
    payload: {
      prompt: "What assumption in this note would be most useful to test next?",
      whyNow: "The current note is active and selected.",
      relatedNoteIds: firstContextItem.sourceId ? [firstContextItem.sourceId] : [],
      depth: "medium",
      suggestedNextAction: "answer_now"
    }
  };
}

export function createMockProviderAdapter(options = {}) {
  const descriptor = normalizeProviderDescriptor({
    providerId: options.providerId || "mock_provider",
    displayName: options.displayName || "Mock Provider",
    adapterType: options.adapterType || "direct_provider",
    authModes: ["local_no_key"],
    regions: ["local"],
    localExecution: options.localExecution === true,
    ...options.descriptor
  });

  let callCount = 0;
  let lastRequest = null;
  const queuedResponses = Array.isArray(options.responses) ? [...options.responses] : [];

  return {
    descriptor,
    get callCount() {
      return callCount;
    },
    get lastRequest() {
      return lastRequest;
    },
    async complete(request = {}) {
      callCount += 1;
      lastRequest = request;
      const response = queuedResponses.length
        ? queuedResponses.shift()
        : {
            status: "succeeded",
            providerId: descriptor.providerId,
            modelRef: request.modelRef || `${descriptor.providerId}:mock-model`,
            output: {
              type: "json",
              json: {
                artifacts: [defaultArtifactForRequest(request)]
              },
              content: "",
              toolCalls: []
            },
            usage: {
              inputTokens: request.contextPack?.budget?.estimatedInputTokens || 1,
              outputTokens: 120,
              totalTokens: (request.contextPack?.budget?.estimatedInputTokens || 1) + 120,
              estimatedCost: 0,
              currency: "USD",
              usageSource: "locally_estimated"
            }
          };
      return normalizeModelResponse(response, request);
    }
  };
}

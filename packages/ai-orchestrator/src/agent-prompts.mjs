function cleanText(value) {
  return String(value || "").trim();
}

function clipText(value, maxLength = 360) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function contextIndex(contextPack = {}) {
  return (contextPack.items || []).map((item, index) => ({
    index: index + 1,
    kind: item.kind,
    sourceId: item.sourceId,
    title: item.title,
    origin: item.origin,
    includedReason: item.includedReason,
    privacyMode: item.privacy?.mode || contextPack.privacy?.mode || "normal",
    relevance: item.relevance || null,
    excerpt: clipText(item.content)
  }));
}

function baseSystemPrompt() {
  return [
    "You are an AI agent embedded in a note-taking product.",
    "Human-authored notes are the user's source of truth.",
    "Do not rewrite, append to, or silently mutate human-authored notes.",
    "Return reviewable AI artifacts only. The user decides what gets accepted or promoted.",
    "Use only the provided context. Preserve note ids as source references."
  ].join("\n");
}

function outputProtocol(expectedArtifactType) {
  return [
    "Return strict JSON with this shape:",
    '{"artifacts":[{"type":"ArtifactType","title":"string","summary":"string","body":"string","payload":{}}]}',
    `Every artifact.type must be "${expectedArtifactType}".`,
    'Use status "pending_review" if status is included.',
    "Do not include final note content or final graph edges."
  ].join("\n");
}

function connectionAgentTask() {
  return [
    "Task: find candidate relationships among the provided notes.",
    "Create LinkSuggestion artifacts only when two notes have a meaningful conceptual relationship.",
    "Allowed relation_type values: supports, complements, contrasts, contradicts, extends, precedes, follows, qualifies, example_of, counterexample_to, same_topic, unexpected_connection, bridges, restates, reframes, appears_in_draft.",
    "Each suggestion payload must include from, to, relationType, rationale, evidence, and suggestedAction.",
    'Use suggestedAction "create_link" for a useful relation and "review_conflict" for tension.',
    "The from.id and to.id values must be note ids from the context index."
  ].join("\n");
}

function reflectionAgentTask() {
  return [
    "Task: create a sparse, high-signal reflection prompt for the current context.",
    "The prompt should help the user clarify assumptions, test reasoning, or decide a next thought step.",
    "Avoid summarizing the note back to the user unless it directly supports the question.",
    "The payload should include prompt, whyNow, relatedNoteIds, depth, and suggestedNextAction."
  ].join("\n");
}

function writingBridgeAgentTask(expectedArtifactType) {
  const common = [
    "Task: find source-grounded writing moves from the selected notes.",
    "Help the user turn accepted notes and relations into a stronger draft structure.",
    "Do not write a full essay, final section, or human-authored note.",
    "Only propose reviewable writing support that keeps source note ids visible."
  ];
  if (expectedArtifactType === "OutlineDraft") {
    return [
      ...common,
      "Create one OutlineDraft artifact with payload sections, sectionPurposes, sourceNoteIds, gaps, and suggestedNextAction.",
      "Mark unsupported sections as gaps instead of inventing support."
    ].join("\n");
  }
  if (expectedArtifactType === "SourceGap") {
    return [
      ...common,
      "Create SourceGap artifacts for claims or sections that need evidence, citation, or verification.",
      "Each payload must include gap, claim, requiredSourceType, relatedNoteIds, and suggestedAction."
    ].join("\n");
  }
  return [
    ...common,
    "Create WritingMove artifacts for claims, counterpoints, transitions, caveats, examples, or section moves.",
    "Each payload must include moveType, text, sourceNoteIds, suggestedLocation, whyItMatters, and suggestedAction.",
    'Use suggestedAction "insert_after_review", "revise", or "find_supporting_note".'
  ].join("\n");
}

function taskPromptForAgent(agent = {}, expectedArtifactType) {
  if (agent.agentId === "connection_agent" || expectedArtifactType === "LinkSuggestion") return connectionAgentTask();
  if (
    agent.agentId === "writing_bridge_agent" ||
    ["WritingMove", "OutlineDraft", "SourceGap"].includes(cleanText(expectedArtifactType))
  ) {
    return writingBridgeAgentTask(cleanText(expectedArtifactType));
  }
  return reflectionAgentTask();
}

export function buildAgentMessages({ agent = {}, contextPack = {}, expectedArtifactType = "ReflectionPrompt", userInstruction = "" } = {}) {
  const context = contextIndex(contextPack);
  const developerPayload = {
    agentId: agent.agentId,
    agentVersion: agent.agentVersion,
    purpose: agent.purpose,
    allowedTools: agent.allowedTools || [],
    outputArtifactTypes: agent.outputArtifactTypes || [],
    privacyMode: contextPack.privacy?.mode || "normal",
    cloudAllowed: contextPack.privacy?.cloudAllowed === true,
    expectedArtifactType,
    contextItemCount: context.length
  };

  return [
    {
      role: "system",
      content: baseSystemPrompt()
    },
    {
      role: "developer",
      content: [
        "Agent run protocol:",
        JSON.stringify(developerPayload, null, 2),
        "",
        outputProtocol(expectedArtifactType)
      ].join("\n")
    },
    {
      role: "user",
      content: [
        taskPromptForAgent(agent, expectedArtifactType),
        "",
        userInstruction ? `User instruction: ${cleanText(userInstruction)}` : "",
        "",
        "Context index:",
        JSON.stringify(context, null, 2)
      ]
        .filter((line) => line !== "")
        .join("\n")
    }
  ];
}

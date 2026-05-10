import { createAgentRegistry } from "./agent-registry.mjs";
import { normalizeArtifacts } from "./artifacts.mjs";
import { createCurrentNoteContextPack, createContextPack } from "./context-pack.mjs";
import { createMockProviderAdapter } from "./mock-provider-adapter.mjs";
import { assertProviderAllowedForContext } from "./provider-adapter.mjs";
import { createInMemoryRunLog } from "./run-log.mjs";

function cleanText(value) {
  return String(value || "").trim();
}

function generatedId(prefix = "task") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function expectedArtifactTypeForAgent(agent) {
  return agent.outputArtifactTypes[0] || "ReflectionPrompt";
}

export function createAiHarness(options = {}) {
  const registry = options.agentRegistry || createAgentRegistry(options.agentDefinitions);
  const runLog = options.runLog || createInMemoryRunLog();
  const providerAdapter = options.providerAdapter || createMockProviderAdapter();

  return {
    registry,
    runLog,
    providerAdapter,
    async runTask(input = {}) {
      const taskId = cleanText(input.taskId || input.task_id) || generatedId("task");
      const agentId = cleanText(input.agentId || input.agent_id) || "reflection_agent";
      const agent = registry.get(agentId);
      const run = runLog.startRun({
        taskId,
        agentId: agent.agentId,
        agentVersion: agent.agentVersion,
        trigger: input.trigger || "user_command",
        taskType: input.taskType || "reflection",
        userMode: input.userMode || "Auto",
        privacyMode: input.privacyMode || input.contextPack?.privacy?.mode || "normal",
        modelTier: input.modelTier || agent.defaultModelTier
      });

      try {
        const contextPack = input.contextPack
          ? createContextPack({ ...input.contextPack, agentRunId: run.agentRunId, taskId })
          : createCurrentNoteContextPack({
              taskId,
              agentRunId: run.agentRunId,
              note: input.currentNote,
              privacyMode: input.privacyMode || "normal"
            });

        assertProviderAllowedForContext(providerAdapter.descriptor, contextPack);
        runLog.addEvent(run.agentRunId, {
          eventType: "context_pack_created",
          summary: {
            contextPackId: contextPack.contextPackId,
            itemCount: contextPack.items.length,
            privacyMode: contextPack.privacy.mode
          }
        });

        const expectedArtifactType = cleanText(input.expectedArtifactType) || expectedArtifactTypeForAgent(agent);
        const providerResponse = await providerAdapter.complete({
          requestId: `${run.agentRunId}_model_1`,
          agentRunId: run.agentRunId,
          purpose: "agent_reasoning",
          modelRef: input.modelRef || `${providerAdapter.descriptor.providerId}:${agent.defaultModelTier}`,
          expectedArtifactType,
          contextPack,
          messages: [],
          tools: [],
          output: { mode: "schema", schema: { artifactType: expectedArtifactType } },
          settings: { stream: false },
          policy: {
            privacyMode: contextPack.privacy.mode,
            allowCloud: contextPack.privacy.cloudAllowed,
            allowFallback: false
          }
        });

        runLog.addEvent(run.agentRunId, {
          eventType: "model_call",
          status: providerResponse.status,
          summary: {
            providerId: providerResponse.providerId,
            modelRef: providerResponse.modelRef,
            purpose: "agent_reasoning"
          },
          usage: providerResponse.usage,
          error: providerResponse.error
        });

        if (providerResponse.status !== "succeeded") {
          const error = new Error(providerResponse.error?.message || "provider response failed");
          error.code = providerResponse.error?.error_type || "AI_PROVIDER_RESPONSE_FAILED";
          throw error;
        }

        const rawArtifacts = providerResponse.output?.json?.artifacts || [];
        const artifacts = normalizeArtifacts(rawArtifacts, {
          agentRunId: run.agentRunId,
          contextPackId: contextPack.contextPackId,
          model: {
            provider: providerAdapter.descriptor.providerId,
            model: providerResponse.modelRef,
            tier: agent.defaultModelTier,
            mode: input.userMode || "Auto"
          },
          privacy: {
            mode: contextPack.privacy.mode,
            cloudModelUsed: providerAdapter.descriptor.localExecution !== true
          },
          sources: {
            noteIds: contextPack.items.filter((item) => item.kind === "note").map((item) => item.sourceId),
            sourceDocIds: contextPack.items.filter((item) => item.kind === "source_doc").map((item) => item.sourceId),
            artifactIds: [],
            externalUrls: []
          }
        });

        for (const artifact of artifacts) {
          runLog.addEvent(run.agentRunId, {
            eventType: "artifact_created",
            summary: {
              artifactId: artifact.id,
              artifactType: artifact.type,
              status: artifact.status
            }
          });
        }

        const finished = runLog.finishRun(run.agentRunId, {
          status: "succeeded",
          contextPackId: contextPack.contextPackId,
          providerId: providerAdapter.descriptor.providerId,
          modelRef: providerResponse.modelRef,
          modelTier: agent.defaultModelTier,
          usage: providerResponse.usage,
          artifactIds: artifacts.map((artifact) => artifact.id)
        });

        return { run: finished, contextPack, artifacts };
      } catch (error) {
        runLog.addEvent(run.agentRunId, {
          eventType: "run_failed",
          status: "failed",
          summary: {
            code: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error)
          },
          error: {
            errorType: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error),
            retryable: false
          }
        });
        const failed = runLog.finishRun(run.agentRunId, {
          status: "failed",
          error: {
            errorType: error?.code || "AI_RUN_FAILED",
            message: String(error?.message || error)
          }
        });
        return { run: failed, contextPack: null, artifacts: [] };
      }
    }
  };
}

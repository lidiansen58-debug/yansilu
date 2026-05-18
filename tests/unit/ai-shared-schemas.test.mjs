import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const SCHEMA_ROOT = path.join(process.cwd(), "schemas");

async function readSchema(name) {
  const raw = await fs.readFile(path.join(SCHEMA_ROOT, name), "utf8");
  return JSON.parse(raw);
}

function validate(schema, value, location = "$") {
  if (!schema || typeof schema !== "object") return;

  if (Array.isArray(schema.type)) {
    const allowed = schema.type;
    const matches = allowed.some((type) => matchesType(type, value));
    assert.equal(matches, true, `${location} expected one of ${allowed.join(", ")}`);
  } else if (schema.type) {
    assert.equal(matchesType(schema.type, value), true, `${location} expected type ${schema.type}`);
  }

  if (schema.enum) {
    assert.equal(schema.enum.includes(value), true, `${location} expected enum value`);
  }

  if ((schema.type === "object" || (Array.isArray(schema.type) && value && typeof value === "object" && !Array.isArray(value))) && value !== null) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      assert.equal(Object.prototype.hasOwnProperty.call(value, key), true, `${location}.${key} is required`);
    }

    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(value)) {
        assert.equal(Object.prototype.hasOwnProperty.call(schema.properties, key), true, `${location}.${key} is not allowed`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) validate(childSchema, value[key], `${location}.${key}`);
    }
  }

  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validate(schema.items, item, `${location}[${index}]`));
  }
}

function matchesType(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

test("AI shared schemas declare the canonical contracts we want to stabilize", async () => {
  const artifact = await readSchema("ai_artifact.schema.json");
  const inboxItem = await readSchema("ai_inbox_item.schema.json");
  const suggestion = await readSchema("ai_suggestion.schema.json");
  const adoptionEvent = await readSchema("ai_adoption_event.schema.json");
  const scheduledTask = await readSchema("ai_scheduled_task.schema.json");

  assert.ok(artifact.required.includes("agent_run_id"));
  assert.ok(artifact.required.includes("sources"));
  assert.ok(artifact.properties.type.enum.includes("LinkSuggestion"));
  assert.ok(artifact.properties.user_decisions.items.properties.decision.enum.includes("promoted_to_note"));

  assert.ok(inboxItem.required.includes("artifact_id"));
  assert.ok(inboxItem.required.includes("action_state"));
  assert.ok(inboxItem.properties.action_state.enum.includes("needs_review"));

  assert.deepEqual(suggestion.properties.status.enum, ["suggested", "adopted_as_draft", "rejected", "edited", "confirmed"]);
  assert.ok(suggestion.required.includes("history"));

  assert.deepEqual(adoptionEvent.properties.subject_kind.enum, ["artifact", "suggestion"]);
  assert.ok(adoptionEvent.properties.event_type.enum.includes("confirmed"));

  assert.ok(scheduledTask.required.includes("scheduled_task_id"));
  assert.ok(scheduledTask.required.includes("schedule"));
  assert.ok(scheduledTask.properties.status.enum.includes("paused"));
  assert.ok(scheduledTask.properties.task_type.enum.includes("reflection_prompt"));
});

test("AI shared schemas accept representative canonical payloads", async () => {
  const artifactSchema = await readSchema("ai_artifact.schema.json");
  const inboxSchema = await readSchema("ai_inbox_item.schema.json");
  const suggestionSchema = await readSchema("ai_suggestion.schema.json");
  const adoptionSchema = await readSchema("ai_adoption_event.schema.json");
  const scheduledTaskSchema = await readSchema("ai_scheduled_task.schema.json");

  const artifact = {
    id: "artifact_01",
    type: "LinkSuggestion",
    title: "Connect two permanent notes",
    summary: "These notes share a recurring tension around tacit knowledge.",
    body: { relation: "supports" },
    status: "accepted",
    origin: "ai_generated",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:05:00.000Z",
    agent_run_id: "run_01",
    context_pack_id: "ctx_01",
    model: { provider: "openai", ref: "platform_managed_openai:standard" },
    sources: {
      note_ids: ["pn_1", "pn_2"],
      source_doc_ids: [],
      artifact_ids: [],
      external_urls: []
    },
    provenance: {
      content_origin: "ai_generated",
      citation_required: false,
      human_accepted: true,
      human_rewritten: false
    },
    confidence: {
      score: 0.72,
      label: "medium",
      reason: "Shared tags and backlink overlap"
    },
    privacy: {
      mode: "normal",
      cloud_model_used: true
    },
    user_decisions: [
      {
        decision_id: "decision_01",
        artifact_id: "artifact_01",
        decision: "accepted",
        user_id: "user_01",
        note_id: "",
        comment: "Looks useful",
        feedback: {
          useful: true,
          noisy: false,
          wrong: false,
          already_known: false,
          privacy_concern: false
        },
        created_at: "2026-05-18T12:05:00.000Z"
      }
    ],
    payload: {
      source_note_ids: ["pn_1", "pn_2"]
    }
  };

  const inboxItem = {
    artifact_id: "artifact_01",
    type: "LinkSuggestion",
    title: "Connect two permanent notes",
    summary: "These notes share a recurring tension around tacit knowledge.",
    status: "accepted",
    action_state: "reviewed",
    origin: "ai_generated",
    privacy_mode: "normal",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:05:00.000Z",
    agent_run_id: "run_01",
    context_pack_id: "ctx_01",
    primary_source_note_id: "pn_1",
    source_note_ids: ["pn_1", "pn_2"],
    source_doc_ids: [],
    decision_count: 1,
    latest_decision: artifact.user_decisions[0],
    confidence: artifact.confidence
  };

  const suggestion = {
    id: "suggestion_01",
    target: {
      type: "permanent_note",
      id: "pn_1",
      field: "thesis"
    },
    scope: "note_field",
    content: "The real leverage comes from compressing judgment, not collecting fragments.",
    status: "confirmed",
    origin: "ai_generated",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:07:00.000Z",
    model: null,
    provenance: {
      content_origin: "ai_generated",
      human_confirmed: true,
      human_edited: true
    },
    history: [
      {
        from_status: "suggested",
        to_status: "adopted_as_draft",
        action: "adopt",
        actor: "user",
        user_id: "user_01",
        comment: "Keep as draft",
        created_at: "2026-05-18T12:03:00.000Z"
      },
      {
        from_status: "adopted_as_draft",
        to_status: "edited",
        action: "edit",
        actor: "user",
        user_id: "user_01",
        comment: "Reworded for precision",
        created_at: "2026-05-18T12:05:00.000Z"
      },
      {
        from_status: "edited",
        to_status: "confirmed",
        action: "confirm",
        actor: "user",
        user_id: "user_01",
        comment: "Now it feels like mine",
        created_at: "2026-05-18T12:07:00.000Z"
      }
    ]
  };

  const adoptionEvent = {
    adoption_event_id: "adoption_01",
    subject_kind: "suggestion",
    subject_id: "suggestion_01",
    event_type: "confirmed",
    actor_type: "user",
    actor_id: "user_01",
    target: {
      kind: "permanent_note",
      id: "pn_1",
      field: "thesis"
    },
    comment: "Now it feels like mine",
    feedback: {
      useful: true,
      noisy: false,
      wrong: false,
      already_known: false,
      privacy_concern: false
    },
    metadata: {
      from_status: "edited",
      to_status: "confirmed",
      note_id: "pn_1"
    },
    created_at: "2026-05-18T12:07:00.000Z"
  };

  const scheduledTask = {
    scheduled_task_id: "sched_reflection_01",
    workspace_id: "local_workspace",
    user_id: "local_user",
    name: "Weekly reflection reminder",
    status: "active",
    task_type: "reflection_prompt",
    agent_id: "reflection_agent",
    schedule: {
      type: "interval",
      timezone: "local",
      day_of_week: "",
      time: "",
      interval_minutes: 30,
      interval_hours: 0,
      interval_days: 0,
      rrule: ""
    },
    scope: {
      project_ids: [],
      note_ids: ["pn_1"],
      directory_ids: [],
      tags: ["reflection"],
      source_feed_ids: [],
      keywords: ["bridge concept"],
      include_private_notes: false
    },
    model: {
      user_mode: "Balanced",
      model_pack: "",
      max_tier: "standard",
      allow_strong_reasoning: false
    },
    budget: {
      max_runs_per_period: 3,
      max_estimated_cost_per_run: 0.35,
      max_estimated_cost_per_period: 1,
      period: "week",
      spent_this_period: 0.35,
      runs_this_period: 1
    },
    privacy: {
      mode: "normal",
      allow_cloud_models: true,
      require_confirmation_for_private_notes: true
    },
    output: {
      destination: "ai_inbox",
      artifact_types: ["ReflectionPrompt"],
      notify_user: "only_if_high_signal"
    },
    run_input: null,
    failure_count: 0,
    last_run_at: "2026-05-18T12:30:00.000Z",
    last_run_status: "succeeded",
    last_run_reason: "",
    last_agent_run_id: "run_sched_01",
    next_run_at: "2026-05-18T13:00:00.000Z",
    created_at: "2026-05-18T12:00:00.000Z",
    updated_at: "2026-05-18T12:30:00.000Z"
  };

  validate(artifactSchema, artifact);
  validate(inboxSchema, inboxItem);
  validate(suggestionSchema, suggestion);
  validate(adoptionSchema, adoptionEvent);
  validate(scheduledTaskSchema, scheduledTask);
});

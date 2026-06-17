const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || "").trim();
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);
const MIN_PASS_COUNT = Number(process.env.OLLAMA_EVAL_MIN_PASS || 3);

function withTimeoutFetch(timeoutMs = REQUEST_TIMEOUT_MS) {
  return async function fetchWithTimeout(url, init = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };
}

async function fetchJson(pathname) {
  const response = await withTimeoutFetch(10000)(`${OLLAMA_BASE_URL}${pathname}`);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Ollama ${pathname} returned HTTP ${response.status}`);
  return json;
}

function preferredModelName(models = []) {
  const names = models.map((model) => String(model?.name || model?.model || "").trim()).filter(Boolean);
  if (OLLAMA_MODEL) return OLLAMA_MODEL;
  for (const pattern of [/qwen3.*8b/i, /qwen2\.5.*7b/i, /qwen3\.5.*9b/i, /qwen3.*4b/i, /llama3\.2.*3b/i, /gemma3.*4b/i, /qwen.*7b/i, /qwen2\.5.*3b/i, /llama3\.1.*8b/i, /phi.*3\.5/i, /gemma2.*2b/i]) {
    const match = names.find((name) => pattern.test(name));
    if (match) return match;
  }
  return names[0] || "";
}

function extractJsonObject(text = "") {
  const clean = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {}

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch {}
  }
  return null;
}

async function completeJson(modelName, userPrompt) {
  const response = await withTimeoutFetch()(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      stream: false,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You are a local note assistant. Return one valid JSON object only. Do not use markdown."
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.error?.message || `Ollama chat returned HTTP ${response.status}`);
  const content = String(json.choices?.[0]?.message?.content || "");
  return {
    raw: content,
    json: extractJsonObject(content),
    usage: json.usage || null
  };
}

function hasText(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength;
}

const EVAL_CASES = [
  {
    id: "summary_json",
    title: "Short note summary",
    prompt:
      'Read this note and return {"summary": string, "key_points": string[]}.\n\nNote:\nActive recall is more useful than rereading because it forces retrieval. Spaced repetition keeps important ideas available at the moment of writing.',
    validate(output) {
      return hasText(output?.summary, 20) && Array.isArray(output?.key_points) && output.key_points.length >= 2;
    }
  },
  {
    id: "tag_json",
    title: "Tag suggestions",
    prompt:
      'Return {"tags": string[]} with 3 to 5 concise tags for this note.\n\nNote:\nA writing project improves when source notes are grouped by claim, counterexample, and unresolved question rather than by collection date.',
    validate(output) {
      return Array.isArray(output?.tags) && output.tags.length >= 3 && output.tags.every((tag) => hasText(tag, 2));
    }
  },
  {
    id: "relation_json",
    title: "Relation candidate",
    prompt:
      'Decide whether Note A and Note B should be linked. Return {"related": boolean, "relation_type": string, "rationale": string}.\n\nNote A: Active recall strengthens memory because it requires retrieval.\nNote B: Spaced repetition schedules review so important ideas remain accessible.',
    validate(output) {
      return output?.related === true && hasText(output?.relation_type, 3) && hasText(output?.rationale, 20);
    }
  },
  {
    id: "structured_decision",
    title: "Structured action decision",
    prompt:
      'Return {"action": "link" | "skip", "confidence": number, "evidence": string[]} for whether these notes should be connected.\n\nSource: Local-first note software keeps user writing in Markdown.\nTarget: Cloud-only software can make export and ownership harder.',
    validate(output) {
      return ["link", "skip"].includes(output?.action) &&
        Number.isFinite(Number(output?.confidence)) &&
        Number(output.confidence) >= 0 &&
        Number(output.confidence) <= 1 &&
        Array.isArray(output?.evidence) &&
        output.evidence.length >= 1;
    }
  }
];

async function runCase(modelName, evalCase) {
  const startedAt = Date.now();
  try {
    const response = await completeJson(modelName, evalCase.prompt);
    const passed = response.json !== null && evalCase.validate(response.json);
    return {
      id: evalCase.id,
      title: evalCase.title,
      passed,
      latencyMs: Date.now() - startedAt,
      output: response.json,
      rawPreview: response.raw.slice(0, 240)
    };
  } catch (error) {
    return {
      id: evalCase.id,
      title: evalCase.title,
      passed: false,
      latencyMs: Date.now() - startedAt,
      error: String(error?.message || error)
    };
  }
}

async function main() {
  let tags;
  try {
    tags = await fetchJson("/api/tags");
  } catch (error) {
    console.error(`Ollama is not reachable at ${OLLAMA_BASE_URL}. Start Ollama, then rerun this script.`);
    console.error(String(error?.message || error));
    process.exitCode = 2;
    return;
  }

  const modelName = preferredModelName(Array.isArray(tags.models) ? tags.models : []);
  if (!modelName) {
    console.error("Ollama is reachable, but no models are installed.");
    console.error("Suggested local models: qwen3:8b (default), qwen2.5:7b (lightweight), qwen3.5:9b (high quality).");
    process.exitCode = 2;
    return;
  }

  const results = [];
  for (const evalCase of EVAL_CASES) {
    results.push(await runCase(modelName, evalCase));
  }

  const passed = results.filter((result) => result.passed).length;
  const summary = {
    ok: passed >= MIN_PASS_COUNT,
    model: modelName,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    passed,
    total: results.length,
    minPassCount: MIN_PASS_COUNT,
    results
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.stack || error?.message || error));
  process.exitCode = 1;
});

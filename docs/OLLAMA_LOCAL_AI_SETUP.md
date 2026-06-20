# Ollama Local AI Setup

This local pack wires Yansilu's OpenAI-compatible provider path to Ollama.

## Prerequisites

- Ollama is installed and running on `http://localhost:11434`.
- At least one Yansilu-supported local model is available. The default recommendation is:

```powershell
ollama pull qwen3:8b
```

Yansilu's first local model catalog is intentionally small:

| Tier | Model | Approx. size | Use |
| --- | --- | --- | --- |
| Lightweight | `qwen2.5:7b` | About 4-5GB | Quick summaries and low-cost candidate screening |
| Recommended | `qwen3:8b` | About 5-6GB | Viewpoint distillation, potential relations, AI suggestions |
| High quality | `qwen3.5:9b` | About 6-7GB | Slower deep analysis and complex material cleanup |

## Configure Yansilu

The AI Settings panel is the primary entry for local AI setup. It can:

- Detect whether Ollama is installed, running, and reachable through the local API.
- Show a guided official install link and copyable install commands. It does not silently install Ollama.
- Start an already installed Ollama runtime when the platform allows it.
- Show installed models, copy `ollama pull <model>` commands, and download a built-in catalog model only after confirmation.
- Save an installed built-in model as the default local model.

Start the API server for development:

```powershell
npm run dev:api
```

In another terminal, save the local provider config:

```powershell
npm run ai:setup:ollama
```

Optional overrides:

```powershell
$env:OLLAMA_MODEL="qwen3:8b"
$env:OLLAMA_BASE_URL="http://localhost:11434"
$env:API_BASE="http://localhost:3000"
npm run ai:setup:ollama
```

## What Runs Locally

- Model pack: `Ollama Local`
- Provider preset: `ollama_local_gateway`
- Chat endpoint: `http://localhost:11434/v1/chat/completions`
- Health endpoint: `http://localhost:11434/api/tags`
- First connected action: `AI Inbox` -> `Generate summary`

The action stores the model output as a reviewed AI Inbox decision and does not mutate source notes or graph relations directly.

## Safety Boundaries

- Yansilu does not install system software without the user.
- Yansilu does not download large model files until the user confirms the specific model.
- Model pull and default-model save actions only accept models from the built-in local model catalog.
- Graph and other feature pages only show a lightweight local AI readiness prompt and route users back to AI Settings.
- Local AI operations do not upload note content by default; hybrid mode may still use remote providers for some tasks.

# Ollama Local AI Setup

This local pack wires Yansilu's OpenAI-compatible provider path to Ollama.

## Prerequisites

- Ollama is installed and running on `http://localhost:11434`.
- A small local model is available, for example:

```powershell
ollama pull qwen2.5:3b
```

## Configure Yansilu

Start the API server:

```powershell
npm run dev:api
```

In another terminal, save the local provider config:

```powershell
npm run ai:setup:ollama
```

Optional overrides:

```powershell
$env:OLLAMA_MODEL="qwen2.5:3b"
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

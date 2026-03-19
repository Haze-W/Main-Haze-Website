# Coral 1.0 — Ollama Setup

Haze uses **Ollama** for local AI. No API keys. Runs on your PC.

## Quick Start

1. **Install Ollama**: https://ollama.com

2. **Pull and run the base model** (in a terminal, keep it running):
   ```bash
   ollama run llama3
   ```

3. **Start Haze**:
   ```bash
   npm run dev
   ```

4. Try: `/ui modern SaaS dashboard with sidebar and analytics`

## Optional: Coral 1.0 Custom Model

For better UI generation, create a specialized model:

```bash
ollama create coral -f ollama/Modelfile
```

Then set `OLLAMA_MODEL=coral` or pass `model: "coral"` in your app config. The default `llama3` works fine too.

## Environment

- `OLLAMA_BASE_URL` — Default: `http://localhost:11434`. Change if Ollama runs elsewhere.

## Deploy

When deploying, your backend proxies to Ollama. Do **not** expose Ollama directly. Flow:

```
Frontend → Your Backend (Next.js) → Ollama (localhost or internal)
```

Ensure Ollama runs on the same machine as your backend, or set `OLLAMA_BASE_URL` to your Ollama server.

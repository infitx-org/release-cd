# James — AI Cluster Troubleshooting Agent

James is a FastAPI-based AI agent that investigates infrastructure health issues in Mojaloop/COMESA Kubernetes environments. It collects observability data from ArgoCD, Prometheus, and Loki, then uses an LLM (or heuristics as a fallback) to produce structured findings and recommendations.

## Features

- **Automated investigation** — accepts a natural-language question and returns ranked findings with root-cause hypotheses and recommendations
- **Multi-source data collection** — ArgoCD application health, Prometheus alerts, Kubernetes pod/event state, Loki log error rates
- **LLM-powered analysis** — uses OpenAI GPT-4o via LangChain/LangGraph; degrades gracefully to heuristics when no API key is configured
- **MCP integration** — optionally connects to k8sgpt via Model Context Protocol for AI-native Kubernetes analysis
- **Slack bot** — Socket Mode bot that accepts investigation requests and posts findings to a configured channel
- **GitHub Copilot Spaces** — optional knowledge-base integration for enriched context

---

## Architecture

```
src/
├── main.py                   # FastAPI app factory + lifespan (startup/shutdown)
├── config.py                 # Pydantic Settings (all config via env vars)
├── api/
│   ├── routes.py             # REST API endpoints
│   └── models.py             # Request/response Pydantic models
├── agents/
│   ├── orchestrator.py       # InvestigationOrchestrator — core agent logic
│   └── prompts.py            # LangChain prompt templates
├── collectors/
│   ├── base.py               # DataCollector abstract base class
│   ├── argocd.py             # ArgoCD application health
│   ├── prometheus.py         # Prometheus alerts + PromQL
│   ├── kubernetes_collector.py  # Pod/event/node state via k8s client
│   └── logs.py               # Loki log error rates
├── integrations/
│   ├── mcp_client.py         # MCP client manager (k8sgpt, etc.)
│   ├── slack_bot.py          # Slack Socket Mode bot
│   └── copilot_spaces.py     # GitHub Copilot Spaces knowledge lookup
└── utils/
    ├── logging.py            # Structured logging setup
    └── metrics.py            # Prometheus metrics exposition
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/readyz` | Readiness probe — checks all collectors |
| `POST` | `/v1/investigate` | Start an investigation |
| `GET` | `/v1/investigations/{id}` | Retrieve investigation result by ID |
| `GET` | `/v1/health/summary` | Aggregated health status across all sources |
| `POST` | `/v1/collect/{source}` | On-demand data collection (`argocd`, `prometheus`, `kubernetes`, `logs`) |
| `GET` | `/v1/knowledge/search` | Search the local ChromaDB knowledge base |

Interactive API docs are available at `http://localhost:8000/docs` when running locally.

---

## Configuration

All configuration is via environment variables (or a `.env` file in the working directory).

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Root log level |
| `ARGOCD_ENDPOINT` | `https://argocd-server.argocd.svc.cluster.local` | ArgoCD API base URL |
| `ARGOCD_TOKEN` | — | ArgoCD API bearer token |
| `ARGOCD_INSECURE` | `false` | Skip TLS verification for ArgoCD |
| `PROMETHEUS_ENDPOINT` | `http://prom-kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090` | Prometheus base URL |
| `LOKI_ENDPOINT` | `http://loki.logging.svc.cluster.local:3100` | Loki base URL |
| `OPENAI_API_KEY` | — | OpenAI key — if absent, falls back to heuristic analysis |
| `LLM_MODEL` | `gpt-4o` | Model name passed to LangChain |
| `LLM_ENDPOINT` | `https://api.openai.com/v1` | Override for Azure OpenAI or local LLM proxy |
| `EMBEDDING_MODEL` | `text-embedding-ada-002` | Model used for knowledge-base embeddings |
| `SLACK_ENABLED` | `false` | Enable Slack Socket Mode bot |
| `SLACK_BOT_TOKEN` | — | `xoxb-` bot token |
| `SLACK_APP_TOKEN` | — | `xapp-` app-level token for Socket Mode |
| `SLACK_CHANNEL` | `incidents` | Default channel for findings |
| `MCP_ENABLED` | `false` | Enable MCP client |
| `MCP_K8SGPT_ENABLED` | `true` | Connect to k8sgpt MCP server |
| `MCP_K8SGPT_URL` | `http://k8sgpt-mcp.ai-agent.svc.cluster.local:8089/sse` | k8sgpt SSE endpoint |
| `REDIS_ENABLED` | `false` | Enable Redis for session caching |
| `REDIS_URL` | `redis://redis-master.redis.svc.cluster.local:6379` | Redis connection URL |
| `CHROMADB_PATH` | `/app/data/chromadb` | Local ChromaDB persistence directory |
| `API_TOKEN` | — | Bearer token required on API requests (disabled if unset) |
| `MAX_INVESTIGATION_STEPS` | `5` | Maximum agent reasoning steps per investigation |
| `INVESTIGATION_TIMEOUT` | `300` | Investigation timeout in seconds |
| `COPILOT_SPACES_ENABLED` | `false` | Enable GitHub Copilot Spaces knowledge lookups |
| `GITHUB_TOKEN` | — | Token for Copilot Spaces API |

---

## Running Locally

### Prerequisites

- Python 3.12
- Access to ArgoCD, Prometheus, and Loki endpoints (or mock / skip via disabled collectors)

### Setup

```bash
cd app/james

# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Optional: copy and edit environment config
cp .env.example .env   # adjust endpoints and tokens
```

### Start the server

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is then available at `http://localhost:8000`. Swagger UI is at `http://localhost:8000/docs`.

### Example: run an investigation

```bash
curl -s -X POST http://localhost:8000/v1/investigate \
  -H "Content-Type: application/json" \
  -d '{"question": "Why are transfers failing in the zm-dev environment?", "context": {"namespace": "mojaloop"}}' \
  | jq .
```

---

## Running with Docker

```bash
# Build
docker build -f james.Dockerfile -t james-agent .

# Run (minimal — heuristics only, no LLM)
docker run -p 8000:8000 \
  -e ARGOCD_ENDPOINT=https://your-argocd \
  -e ARGOCD_TOKEN=your-token \
  -e PROMETHEUS_ENDPOINT=http://your-prometheus:9090 \
  -e LOKI_ENDPOINT=http://your-loki:3100 \
  james-agent

# Run with LLM analysis
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-... \
  -e ARGOCD_ENDPOINT=https://your-argocd \
  -e ARGOCD_TOKEN=your-token \
  james-agent
```

The container runs as a non-root user (`aiagent`, uid 1000) and listens on port `8000`.

---

## Tests

```bash
source .venv/bin/activate
pip install -r requirements-test.txt

pytest tests/ -v
```

116 unit tests covering config, models, all four collectors, the investigation orchestrator, API routes, and logging utilities. Tests use `pytest-asyncio` in `auto` mode and mock all external I/O.

---

## Heuristic fallback

When `OPENAI_API_KEY` is not set, the orchestrator skips LLM calls and produces findings directly from the collected data:

- Failed or crash-looping pods → `CRITICAL` finding
- Firing critical Prometheus alerts → `CRITICAL` finding  
- Degraded ArgoCD applications → `WARNING` finding
- Elevated log error rates → `WARNING` finding

This allows the agent to run in air-gapped or cost-constrained environments while still producing actionable output.

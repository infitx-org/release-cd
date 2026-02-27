"""AI Cluster Troubleshooting Agent - Main entrypoint."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.api.routes import router
from src.utils.logging import setup_logging
from src.utils.metrics import setup_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    settings = get_settings()
    setup_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    # Initialize collectors and agent on startup
    from src.collectors.argocd import ArgoCDCollector
    from src.collectors.prometheus import PrometheusCollector
    from src.collectors.kubernetes_collector import KubernetesCollector
    from src.collectors.logs import LogsCollector
    from src.agents.orchestrator import InvestigationOrchestrator

    argocd = ArgoCDCollector(settings.argocd_endpoint, settings.argocd_token)
    prometheus = PrometheusCollector(settings.prometheus_endpoint)
    kubernetes = KubernetesCollector()
    logs = LogsCollector(settings.loki_endpoint)

    # Initialize MCP client manager
    mcp_manager = None
    if settings.mcp_enabled:
        from src.integrations.mcp_client import MCPClientManager
        servers_config = []
        if settings.mcp_k8sgpt_enabled:
            servers_config.append({
                "name": "k8sgpt",
                "enabled": True,
                "type": "k8sgpt",
                "transport": "sse",
                "url": settings.mcp_k8sgpt_url,
                "permissions": ["read"],
                "rateLimit": 60,
            })
        if servers_config:
            mcp_manager = MCPClientManager(servers_config)
            await mcp_manager.initialize()
            logger.info(f"MCP client initialized with {len(servers_config)} server(s)")

    orchestrator = InvestigationOrchestrator(settings, argocd, prometheus, kubernetes, logs, mcp_manager)

    app.state.argocd = argocd
    app.state.prometheus = prometheus
    app.state.kubernetes = kubernetes
    app.state.logs = logs
    app.state.orchestrator = orchestrator
    app.state.settings = settings

    # Start Slack bot if enabled
    if settings.slack_enabled and settings.slack_bot_token:
        from src.integrations.slack_bot import SlackBot
        slack_bot = SlackBot(settings.slack_bot_token, settings.slack_app_token, orchestrator)
        app.state.slack_bot = slack_bot
        asyncio.create_task(slack_bot.start())
        logger.info("Slack bot started")

    logger.info("AI Agent service started")
    yield

    logger.info("AI Agent service shutting down")
    if app.state.get("mcp_manager"):
        await app.state.mcp_manager.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Cluster Troubleshooting Agent",
        description="AI-powered autonomous cluster troubleshooting service",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    setup_metrics(app)

    return app


app = create_app()

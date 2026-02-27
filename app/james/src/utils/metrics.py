"""Prometheus metrics setup."""
import logging

from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

logger = logging.getLogger(__name__)

# Metrics
investigations_total = Counter(
    "ai_agent_investigations_total",
    "Total number of investigations started",
    ["status"],
)

investigation_duration_seconds = Histogram(
    "ai_agent_investigation_duration_seconds",
    "Duration of investigations in seconds",
    buckets=[5, 10, 30, 60, 120, 300],
)

collector_requests_total = Counter(
    "ai_agent_collector_requests_total",
    "Total collector data fetch requests",
    ["collector", "status"],
)

api_requests_total = Counter(
    "ai_agent_api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)

active_investigations = Gauge(
    "ai_agent_active_investigations",
    "Number of currently running investigations",
)


def setup_metrics(app):
    """Mount Prometheus /metrics endpoint on the FastAPI app."""
    try:
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
        logger.info("Prometheus metrics endpoint mounted at /metrics")
    except Exception as e:
        logger.warning(f"Failed to set up metrics: {e}")

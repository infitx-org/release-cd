"""Shared pytest fixtures for james app unit tests."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from src.config import Settings


@pytest.fixture
def settings():
    """Return a Settings instance with safe test defaults."""
    return Settings(
        LOG_LEVEL="DEBUG",
        ARGOCD_ENDPOINT="http://argocd.test",
        ARGOCD_TOKEN="test-token",
        PROMETHEUS_ENDPOINT="http://prometheus.test",
        LOKI_ENDPOINT="http://loki.test",
        OPENAI_API_KEY=None,
        LLM_MODEL="gpt-4o",
        MAX_INVESTIGATION_STEPS=5,
        COPILOT_SPACES_ENABLED=False,
        SLACK_ENABLED=False,
        MCP_ENABLED=False,
        REDIS_ENABLED=False,
        API_TOKEN=None,
    )


@pytest.fixture
def mock_argocd():
    collector = AsyncMock()
    collector.get_high_level_summary = AsyncMock(return_value={
        "available": True,
        "total_apps": 3,
        "healthy": 3,
        "degraded": 0,
        "missing": 0,
        "unknown": 0,
        "out_of_sync": 0,
        "recent_sync_failures": [],
    })
    collector.get_detailed_data = AsyncMock(return_value={"apps": []})
    collector.get_recent_anomalies = AsyncMock(return_value=[])
    return collector


@pytest.fixture
def mock_prometheus():
    collector = AsyncMock()
    collector.get_high_level_summary = AsyncMock(return_value={
        "available": True,
        "active_alerts": {"critical": 0, "warning": 0, "info": 0},
        "top_alerts": [],
        "total_firing": 0,
    })
    collector.get_detailed_data = AsyncMock(return_value={"result": []})
    collector.get_recent_anomalies = AsyncMock(return_value=[])
    return collector


@pytest.fixture
def mock_kubernetes():
    collector = AsyncMock()
    collector.get_high_level_summary = AsyncMock(return_value={
        "available": True,
        "total_pods": 10,
        "running": 10,
        "pending": 0,
        "failed": 0,
        "succeeded": 0,
        "crashlooping": 0,
        "oom_killed": 0,
        "recent_events": [],
        "deployment_issues": [],
    })
    collector.get_detailed_data = AsyncMock(return_value={})
    collector.get_recent_anomalies = AsyncMock(return_value=[])
    return collector


@pytest.fixture
def mock_logs():
    collector = AsyncMock()
    collector.get_high_level_summary = AsyncMock(return_value={
        "available": True,
        "services_with_errors": 0,
        "top_error_services": [],
    })
    collector.get_detailed_data = AsyncMock(return_value={})
    collector.get_recent_anomalies = AsyncMock(return_value=[])
    return collector

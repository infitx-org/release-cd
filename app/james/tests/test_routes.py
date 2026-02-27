"""Unit tests for src/api/routes.py."""
import pytest
from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routes import router
from src.api.models import (
    InvestigationResponse,
    InvestigationStatus,
    Finding,
    FindingSeverity,
)


def _make_app(
    orchestrator=None,
    argocd=None,
    prometheus=None,
    kubernetes=None,
    logs=None,
    settings=None,
) -> FastAPI:
    """Build a minimal FastAPI app with mocked state for testing."""
    app = FastAPI()
    app.include_router(router)

    # Set state directly on the app object — no lifespan/startup needed.
    app.state.orchestrator = orchestrator or AsyncMock()
    app.state.argocd = argocd or AsyncMock()
    app.state.prometheus = prometheus or AsyncMock()
    app.state.kubernetes = kubernetes or AsyncMock()
    app.state.logs = logs or AsyncMock()
    app.state.settings = settings or MagicMock(copilot_spaces_enabled=False)

    return app


class TestHealthEndpoints:
    """Tests for /healthz and /readyz endpoints."""

    def test_liveness_returns_ok(self):
        """GET /healthz should return 200 with status ok."""
        app = _make_app()
        client = TestClient(app)

        response = client.get("/healthz")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_readiness_returns_ok_with_collectors(self):
        """GET /readyz should return 200 and list the collectors."""
        app = _make_app()
        client = TestClient(app)

        response = client.get("/readyz")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "argocd" in data["collectors"]
        assert "prometheus" in data["collectors"]
        assert "kubernetes" in data["collectors"]
        assert "logs" in data["collectors"]


class TestHealthSummaryEndpoint:
    """Tests for GET /v1/health/summary."""

    def _healthy_summaries(self):
        argocd = AsyncMock()
        argocd.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "healthy": 5,
            "degraded": 0,
            "failed": 0,
        })
        prom = AsyncMock()
        prom.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "active_alerts": {"critical": 0, "warning": 0, "info": 0},
        })
        k8s = AsyncMock()
        k8s.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "failed": 0,
            "pending": 0,
            "recent_events": [],
        })
        return argocd, prom, k8s

    def test_returns_healthy_when_all_green(self):
        """Should report overall_health=healthy when no issues are detected."""
        argocd, prom, k8s = self._healthy_summaries()
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 200
        assert response.json()["overall_health"] == "healthy"

    def test_returns_failed_when_critical_alerts_firing(self):
        """Should report overall_health=failed when critical Prometheus alerts fire."""
        argocd, prom, k8s = self._healthy_summaries()
        prom.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "active_alerts": {"critical": 2, "warning": 0, "info": 0},
        })
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 200
        assert response.json()["overall_health"] == "failed"

    def test_returns_failed_when_argocd_apps_failed(self):
        """Should report overall_health=failed when ArgoCD apps are failed."""
        argocd, prom, k8s = self._healthy_summaries()
        argocd.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "healthy": 3,
            "degraded": 0,
            "failed": 1,
        })
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 200
        assert response.json()["overall_health"] == "failed"

    def test_returns_degraded_when_warning_alerts_firing(self):
        """Should report overall_health=degraded for warning-level alerts."""
        argocd, prom, k8s = self._healthy_summaries()
        prom.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "active_alerts": {"critical": 0, "warning": 1, "info": 0},
        })
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 200
        assert response.json()["overall_health"] == "degraded"

    def test_returns_degraded_when_argocd_apps_degraded(self):
        """Should report overall_health=degraded when ArgoCD apps are degraded."""
        argocd, prom, k8s = self._healthy_summaries()
        argocd.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "healthy": 4,
            "degraded": 1,
            "failed": 0,
        })
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 200
        assert response.json()["overall_health"] == "degraded"

    def test_includes_component_data(self):
        """Should include all component summaries in the response."""
        argocd, prom, k8s = self._healthy_summaries()
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        data = response.json()
        assert "argocd" in data["components"]
        assert "prometheus" in data["components"]
        assert "kubernetes" in data["components"]

    def test_returns_500_when_collector_raises(self):
        """Should return 500 when a collector raises an unexpected error."""
        argocd = AsyncMock()
        argocd.get_high_level_summary = AsyncMock(side_effect=RuntimeError("Unexpected"))
        prom = AsyncMock()
        prom.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "active_alerts": {"critical": 0, "warning": 0, "info": 0},
        })
        k8s = AsyncMock()
        k8s.get_high_level_summary = AsyncMock(return_value={
            "available": True,
            "failed": 0,
            "pending": 0,
            "recent_events": [],
        })
        app = _make_app(argocd=argocd, prometheus=prom, kubernetes=k8s)
        client = TestClient(app)

        response = client.get("/v1/health/summary")

        assert response.status_code == 500


class TestInvestigateEndpoints:
    """Tests for POST /v1/investigate and GET /v1/investigations/{id}."""

    def _make_investigation_response(self, inv_id: str = "inv-test123") -> InvestigationResponse:
        return InvestigationResponse(
            investigation_id=inv_id,
            status=InvestigationStatus.completed,
            question="Test question",
            summary="No issues found",
        )

    def test_post_investigate_returns_200(self):
        """POST /v1/investigate should return 200 with investigation response."""
        orchestrator = AsyncMock()
        orchestrator.investigate = AsyncMock(
            return_value=self._make_investigation_response()
        )
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        response = client.post(
            "/v1/investigate",
            json={"question": "Why are pods crashing?"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["investigation_id"] == "inv-test123"
        assert data["status"] == "completed"

    def test_post_investigate_passes_question_to_orchestrator(self):
        """Should pass the question from the request body to the orchestrator."""
        orchestrator = AsyncMock()
        orchestrator.investigate = AsyncMock(
            return_value=self._make_investigation_response()
        )
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        client.post(
            "/v1/investigate",
            json={"question": "Check namespace production"},
        )

        orchestrator.investigate.assert_called_once()
        call_kwargs = orchestrator.investigate.call_args[1]
        assert call_kwargs["question"] == "Check namespace production"

    def test_post_investigate_passes_context_to_orchestrator(self):
        """Should pass the optional context dict to the orchestrator."""
        orchestrator = AsyncMock()
        orchestrator.investigate = AsyncMock(
            return_value=self._make_investigation_response()
        )
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        client.post(
            "/v1/investigate",
            json={
                "question": "Test",
                "context": {"namespace": "staging"},
            },
        )

        call_kwargs = orchestrator.investigate.call_args[1]
        assert call_kwargs["context"]["namespace"] == "staging"

    def test_post_investigate_returns_500_on_orchestrator_error(self):
        """Should return 500 when the orchestrator raises an exception."""
        orchestrator = AsyncMock()
        orchestrator.investigate = AsyncMock(side_effect=RuntimeError("Failure"))
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        response = client.post(
            "/v1/investigate",
            json={"question": "Test"},
        )

        assert response.status_code == 500

    def test_get_investigation_returns_investigation(self):
        """GET /v1/investigations/{id} should return the investigation by ID."""
        inv = self._make_investigation_response("inv-abc")
        orchestrator = AsyncMock()
        orchestrator.get_investigation = AsyncMock(return_value=inv)
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        response = client.get("/v1/investigations/inv-abc")

        assert response.status_code == 200
        assert response.json()["investigation_id"] == "inv-abc"

    def test_get_investigation_returns_404_when_not_found(self):
        """GET /v1/investigations/{id} should return 404 for unknown IDs."""
        orchestrator = AsyncMock()
        orchestrator.get_investigation = AsyncMock(return_value=None)
        app = _make_app(orchestrator=orchestrator)
        client = TestClient(app)

        response = client.get("/v1/investigations/inv-nonexistent")

        assert response.status_code == 404


class TestCollectEndpoint:
    """Tests for POST /v1/collect/{source}."""

    def test_returns_400_for_unknown_source(self):
        """Should return 400 when an unknown data source is specified."""
        app = _make_app()
        client = TestClient(app)

        response = client.post(
            "/v1/collect/unknown_source",
            json={"query": {}, "time_range": "1h"},
        )

        assert response.status_code == 400
        assert "unknown_source" in response.json()["detail"]

    def test_delegates_to_correct_collector(self):
        """Should call get_detailed_data on the specified collector."""
        argocd = AsyncMock()
        argocd.get_detailed_data = AsyncMock(return_value={"apps": []})
        app = _make_app(argocd=argocd)
        client = TestClient(app)

        response = client.post(
            "/v1/collect/argocd",
            json={"query": {"app_name": "my-app"}, "time_range": "6h"},
        )

        assert response.status_code == 200
        argocd.get_detailed_data.assert_called_once()
        data = response.json()
        assert data["source"] == "argocd"

    def test_returns_500_on_collector_error(self):
        """Should return 500 when the collector raises an unexpected error."""
        argocd = AsyncMock()
        argocd.get_detailed_data = AsyncMock(side_effect=Exception("Collector down"))
        app = _make_app(argocd=argocd)
        client = TestClient(app)

        response = client.post(
            "/v1/collect/argocd",
            json={"query": {}, "time_range": "1h"},
        )

        assert response.status_code == 500

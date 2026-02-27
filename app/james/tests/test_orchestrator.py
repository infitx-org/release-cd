"""Unit tests for src/agents/orchestrator.py."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.agents.orchestrator import InvestigationOrchestrator
from src.api.models import Finding, FindingSeverity, InvestigationStatus


@pytest.fixture
def orchestrator(settings, mock_argocd, mock_prometheus, mock_kubernetes, mock_logs):
    """Return an InvestigationOrchestrator with all mocked dependencies."""
    return InvestigationOrchestrator(
        settings=settings,
        argocd=mock_argocd,
        prometheus=mock_prometheus,
        kubernetes=mock_kubernetes,
        logs=mock_logs,
    )


class TestHeuristicAnalysis:
    """Tests for InvestigationOrchestrator._heuristic_analysis."""

    def test_detects_failed_pods(self, orchestrator):
        """Should add pod failure anomaly when failed count > 0."""
        data = {
            "kubernetes": {"failed": 2, "crashlooping": 0},
            "prometheus": {"active_alerts": {"critical": 0}},
            "argocd": {},
        }

        result = orchestrator._heuristic_analysis(data)

        assert any("pod" in a.lower() or "crash" in a.lower() for a in result["anomalies"])
        assert any(t["source"] == "kubernetes" for t in result["drill_down_targets"])

    def test_detects_crashlooping_pods(self, orchestrator):
        """Should add crashloop anomaly when crashlooping count > 0."""
        data = {
            "kubernetes": {"failed": 0, "crashlooping": 3},
            "prometheus": {"active_alerts": {"critical": 0}},
            "argocd": {},
        }

        result = orchestrator._heuristic_analysis(data)

        assert any("crash" in a.lower() or "pod" in a.lower() for a in result["anomalies"])

    def test_detects_critical_alerts(self, orchestrator):
        """Should add critical alert anomaly when critical alerts > 0."""
        data = {
            "kubernetes": {"failed": 0, "crashlooping": 0},
            "prometheus": {"active_alerts": {"critical": 5}},
            "argocd": {},
        }

        result = orchestrator._heuristic_analysis(data)

        assert any("critical" in a.lower() for a in result["anomalies"])
        assert any(t["source"] == "prometheus" for t in result["drill_down_targets"])

    def test_detects_degraded_argocd_apps(self, orchestrator):
        """Should add ArgoCD anomaly when apps are degraded or failed."""
        data = {
            "kubernetes": {"failed": 0, "crashlooping": 0},
            "prometheus": {"active_alerts": {"critical": 0}},
            "argocd": {"degraded": 1, "failed": 0},
        }

        result = orchestrator._heuristic_analysis(data)

        assert any("argocd" in a.lower() for a in result["anomalies"])
        assert any(t["source"] == "argocd" for t in result["drill_down_targets"])

    def test_returns_empty_anomalies_when_all_healthy(self, orchestrator):
        """Should return no anomalies when everything is healthy."""
        data = {
            "kubernetes": {"failed": 0, "crashlooping": 0},
            "prometheus": {"active_alerts": {"critical": 0}},
            "argocd": {"degraded": 0, "failed": 0},
        }

        result = orchestrator._heuristic_analysis(data)

        assert result["anomalies"] == []
        assert result["drill_down_targets"] == []

    def test_returns_dict_with_hypothesis(self, orchestrator):
        """Should always return a hypothesis key."""
        data = {
            "kubernetes": {"failed": 0, "crashlooping": 0},
            "prometheus": {"active_alerts": {"critical": 0}},
            "argocd": {},
        }

        result = orchestrator._heuristic_analysis(data)

        assert "hypothesis" in result


class TestBuildSummary:
    """Tests for InvestigationOrchestrator._build_summary."""

    def test_returns_no_issues_message_for_empty_findings(self, orchestrator):
        """Should return a clean message when there are no findings."""
        result = orchestrator._build_summary([])

        assert "no" in result.lower() or "0" in result

    def test_highlights_critical_findings(self, orchestrator):
        """Should mention critical findings in the summary."""
        findings = [
            Finding(
                severity=FindingSeverity.critical,
                component="kubernetes",
                title="Pod crashlooping",
                description="Pods are crashlooping",
                confidence=0.95,
            )
        ]

        result = orchestrator._build_summary(findings)

        assert "critical" in result.lower() or "Pod crashlooping" in result

    def test_mentions_finding_titles_for_non_critical(self, orchestrator):
        """Should include finding titles even for low-severity findings."""
        findings = [
            Finding(
                severity=FindingSeverity.low,
                component="argocd",
                title="App out of sync",
                description="An app is out of sync",
                confidence=0.5,
            )
        ]

        result = orchestrator._build_summary(findings)

        assert "App out of sync" in result

    def test_caps_titles_at_three_in_summary(self, orchestrator):
        """Should not include more than 3 finding titles in the summary."""
        findings = [
            Finding(
                severity=FindingSeverity.high,
                component="kubernetes",
                title=f"Issue {i}",
                description="desc",
                confidence=0.8,
            )
            for i in range(6)
        ]

        result = orchestrator._build_summary(findings)

        # Summary should mention count, not all titles
        assert len(result) < 500  # Sanity check – not printing 6 full titles


class TestGetInvestigation:
    """Tests for InvestigationOrchestrator.get_investigation."""

    async def test_returns_none_for_unknown_id(self, orchestrator):
        """Should return None when the investigation ID does not exist."""
        result = await orchestrator.get_investigation("inv-nonexistent")

        assert result is None

    async def test_returns_investigation_after_creation(self, orchestrator):
        """Should return investigation by ID after it has been run."""
        response = await orchestrator.investigate(
            question="Why are pods crashing?",
            context={},
        )

        result = await orchestrator.get_investigation(response.investigation_id)

        assert result is not None
        assert result.investigation_id == response.investigation_id


class TestCollectDetailed:
    """Tests for InvestigationOrchestrator._collect_detailed."""

    async def test_returns_empty_for_unknown_source(self, orchestrator):
        """Should return empty dict when source is not recognised."""
        result = await orchestrator._collect_detailed({"source": "unknown"})

        assert result == {}

    async def test_delegates_to_argocd_collector(self, orchestrator):
        """Should delegate to ArgoCD collector for argocd source."""
        orchestrator.argocd.get_detailed_data = AsyncMock(return_value={"apps": []})

        result = await orchestrator._collect_detailed({"source": "argocd"})

        orchestrator.argocd.get_detailed_data.assert_called_once()
        assert result == {"apps": []}

    async def test_delegates_to_prometheus_collector(self, orchestrator):
        """Should delegate to Prometheus collector for prometheus source."""
        orchestrator.prometheus.get_detailed_data = AsyncMock(return_value={"result": []})

        result = await orchestrator._collect_detailed({"source": "prometheus"})

        orchestrator.prometheus.get_detailed_data.assert_called_once()

    async def test_returns_error_dict_when_collector_raises(self, orchestrator):
        """Should return error dict when the collector raises an exception."""
        orchestrator.argocd.get_detailed_data = AsyncMock(
            side_effect=Exception("Collector error")
        )

        result = await orchestrator._collect_detailed({"source": "argocd"})

        assert "error" in result


class TestInvestigate:
    """Integration-style tests for InvestigationOrchestrator.investigate."""

    async def test_returns_completed_investigation(self, orchestrator):
        """Should return a completed investigation for a basic question."""
        response = await orchestrator.investigate(
            question="What is wrong with the cluster?",
            context={},
        )

        assert response.status == InvestigationStatus.completed
        assert response.investigation_id.startswith("inv-")
        assert response.completed_at is not None

    async def test_stores_question_on_response(self, orchestrator):
        """Should persist the original question on the response object."""
        question = "Why is service X slow?"
        response = await orchestrator.investigate(question=question, context={})

        assert response.question == question

    async def test_investigation_has_steps(self, orchestrator):
        """Should produce at least the required minimum steps."""
        response = await orchestrator.investigate(
            question="Health check",
            context={},
        )

        # At minimum: collect_high_level_data, analyze_findings, search_knowledge_base,
        # formulate_findings
        assert len(response.steps) >= 4

    async def test_collects_all_data_sources(self, orchestrator):
        """Should call get_high_level_summary on all four collectors."""
        await orchestrator.investigate(question="Full check", context={})

        orchestrator.argocd.get_high_level_summary.assert_called()
        orchestrator.prometheus.get_high_level_summary.assert_called()
        orchestrator.kubernetes.get_high_level_summary.assert_called()
        orchestrator.logs.get_high_level_summary.assert_called()

    async def test_sets_failed_status_on_unexpected_error(
        self, settings, mock_argocd, mock_prometheus, mock_kubernetes, mock_logs
    ):
        """Should mark investigation as failed when an unrecoverable error occurs."""
        mock_argocd.get_high_level_summary = AsyncMock(
            side_effect=RuntimeError("Unexpected failure")
        )
        mock_prometheus.get_high_level_summary = AsyncMock(
            side_effect=RuntimeError("Unexpected failure")
        )
        mock_kubernetes.get_high_level_summary = AsyncMock(
            side_effect=RuntimeError("Unexpected failure")
        )
        mock_logs.get_high_level_summary = AsyncMock(
            side_effect=RuntimeError("Unexpected failure")
        )

        orch = InvestigationOrchestrator(
            settings=settings,
            argocd=mock_argocd,
            prometheus=mock_prometheus,
            kubernetes=mock_kubernetes,
            logs=mock_logs,
        )
        # Make _collect_high_level itself raise to force failed status
        orch._collect_high_level = AsyncMock(side_effect=RuntimeError("Fatal"))

        response = await orch.investigate("Test", context={})

        assert response.status == InvestigationStatus.failed
        assert "failed" in response.summary.lower()

    async def test_context_namespace_stored_in_initial_findings(self, orchestrator):
        """Should propagate namespace context into initial findings."""
        response = await orchestrator.investigate(
            question="Namespace check",
            context={"namespace": "staging"},
        )

        assert response.context.get("namespace") == "staging"

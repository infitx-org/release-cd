"""Unit tests for src/api/models.py."""
import pytest
from pydantic import ValidationError

from src.api.models import (
    CollectRequest,
    Finding,
    FindingSeverity,
    HealthSummaryResponse,
    InvestigateRequest,
    InvestigationResponse,
    InvestigationStatus,
    InvestigationStep,
    KnowledgeSearchRequest,
)


class TestInvestigationStatus:
    """Tests for InvestigationStatus enum."""

    def test_valid_values(self):
        """All expected status values should be valid."""
        assert InvestigationStatus.pending == "pending"
        assert InvestigationStatus.running == "running"
        assert InvestigationStatus.completed == "completed"
        assert InvestigationStatus.failed == "failed"


class TestFindingSeverity:
    """Tests for FindingSeverity enum."""

    def test_valid_values(self):
        """All expected severity levels should be valid."""
        assert FindingSeverity.critical == "critical"
        assert FindingSeverity.high == "high"
        assert FindingSeverity.medium == "medium"
        assert FindingSeverity.low == "low"
        assert FindingSeverity.info == "info"


class TestInvestigateRequest:
    """Tests for InvestigateRequest model."""

    def test_requires_question(self):
        """Should raise ValidationError when question is missing."""
        with pytest.raises(ValidationError):
            InvestigateRequest()

    def test_valid_with_question_only(self):
        """Should accept a request with only a question."""
        req = InvestigateRequest(question="Why are pods crashing?")

        assert req.question == "Why are pods crashing?"
        assert req.context is None

    def test_valid_with_context(self):
        """Should accept a request with optional context dict."""
        req = InvestigateRequest(
            question="High memory usage",
            context={"namespace": "production", "time_range": "1h"},
        )

        assert req.context["namespace"] == "production"
        assert req.context["time_range"] == "1h"


class TestFinding:
    """Tests for Finding model."""

    def test_valid_finding(self):
        """Should create a valid finding with all required fields."""
        finding = Finding(
            severity=FindingSeverity.high,
            component="kubernetes",
            title="Pod crashlooping",
            description="Pod my-app-123 is crash looping",
            confidence=0.9,
        )

        assert finding.severity == FindingSeverity.high
        assert finding.component == "kubernetes"
        assert finding.title == "Pod crashlooping"
        assert finding.confidence == 0.9
        assert finding.evidence == []
        assert finding.potential_causes == []
        assert finding.recommendations == []

    def test_confidence_lower_bound(self):
        """Should reject confidence below 0.0."""
        with pytest.raises(ValidationError):
            Finding(
                severity=FindingSeverity.low,
                component="kubernetes",
                title="Test",
                description="Test",
                confidence=-0.1,
            )

    def test_confidence_upper_bound(self):
        """Should reject confidence above 1.0."""
        with pytest.raises(ValidationError):
            Finding(
                severity=FindingSeverity.low,
                component="kubernetes",
                title="Test",
                description="Test",
                confidence=1.1,
            )

    def test_confidence_boundary_values(self):
        """Should accept confidence exactly at 0.0 and 1.0."""
        f_min = Finding(
            severity=FindingSeverity.info,
            component="cluster",
            title="Test",
            description="Test",
            confidence=0.0,
        )
        f_max = Finding(
            severity=FindingSeverity.critical,
            component="cluster",
            title="Test",
            description="Test",
            confidence=1.0,
        )

        assert f_min.confidence == 0.0
        assert f_max.confidence == 1.0

    def test_lists_stored_correctly(self):
        """Should store evidence, causes, and recommendations lists."""
        finding = Finding(
            severity=FindingSeverity.medium,
            component="logs",
            title="High error rate",
            description="Errors exceeding threshold",
            evidence=["500 errors in last 5m", "Stack trace in logs"],
            potential_causes=["Memory leak", "Uncaught exception"],
            recommendations=["Check logs", "Increase heap size"],
            confidence=0.75,
        )

        assert len(finding.evidence) == 2
        assert len(finding.potential_causes) == 2
        assert len(finding.recommendations) == 2


class TestInvestigationResponse:
    """Tests for InvestigationResponse model."""

    def test_auto_generates_investigation_id(self):
        """Should auto-generate a unique investigation_id."""
        r1 = InvestigationResponse(
            status=InvestigationStatus.running,
            question="Test question",
        )
        r2 = InvestigationResponse(
            status=InvestigationStatus.running,
            question="Test question",
        )

        assert r1.investigation_id.startswith("inv-")
        assert r1.investigation_id != r2.investigation_id

    def test_default_empty_lists(self):
        """Steps and findings should default to empty lists."""
        resp = InvestigationResponse(
            status=InvestigationStatus.pending,
            question="Some question",
        )

        assert resp.steps == []
        assert resp.findings == []

    def test_completed_at_defaults_to_none(self):
        """completed_at should be None until explicitly set."""
        resp = InvestigationResponse(
            status=InvestigationStatus.running,
            question="Some question",
        )

        assert resp.completed_at is None

    def test_accepts_steps_and_findings(self):
        """Should accept steps and findings when provided."""
        step = InvestigationStep(step_number=1, action="collect_data")
        finding = Finding(
            severity=FindingSeverity.low,
            component="argocd",
            title="App out of sync",
            description="ArgoCD app is out of sync",
            confidence=0.6,
        )
        resp = InvestigationResponse(
            investigation_id="inv-abc123",
            status=InvestigationStatus.completed,
            question="Health check",
            steps=[step],
            findings=[finding],
            summary="1 low severity issue found",
        )

        assert len(resp.steps) == 1
        assert len(resp.findings) == 1
        assert resp.summary == "1 low severity issue found"


class TestCollectRequest:
    """Tests for CollectRequest model."""

    def test_default_time_range(self):
        """Should default time_range to '1h'."""
        req = CollectRequest()

        assert req.time_range == "1h"

    def test_custom_time_range(self):
        """Should accept custom time_range."""
        req = CollectRequest(time_range="6h", query={"namespace": "default"})

        assert req.time_range == "6h"
        assert req.query["namespace"] == "default"


class TestKnowledgeSearchRequest:
    """Tests for KnowledgeSearchRequest model."""

    def test_requires_query(self):
        """Should raise ValidationError when query is missing."""
        with pytest.raises(ValidationError):
            KnowledgeSearchRequest()

    def test_default_top_k(self):
        """Should default top_k to 5."""
        req = KnowledgeSearchRequest(query="OOM killed pods")

        assert req.top_k == 5

    def test_top_k_min_bound(self):
        """Should reject top_k below 1."""
        with pytest.raises(ValidationError):
            KnowledgeSearchRequest(query="test", top_k=0)

    def test_top_k_max_bound(self):
        """Should reject top_k above 20."""
        with pytest.raises(ValidationError):
            KnowledgeSearchRequest(query="test", top_k=21)

    def test_valid_top_k_range(self):
        """Should accept top_k values at boundaries."""
        r_min = KnowledgeSearchRequest(query="test", top_k=1)
        r_max = KnowledgeSearchRequest(query="test", top_k=20)

        assert r_min.top_k == 1
        assert r_max.top_k == 20

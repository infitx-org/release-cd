"""Unit tests for src/collectors/prometheus.py."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from src.collectors.prometheus import PrometheusCollector


def _make_alert(name: str, severity: str, state: str = "firing") -> dict:
    """Helper to build a minimal Prometheus alert object."""
    return {
        "labels": {"alertname": name, "severity": severity},
        "annotations": {"summary": f"{name} is firing"},
        "state": state,
    }


class TestPrometheusCollectorInit:
    """Tests for PrometheusCollector initialisation."""

    def test_strips_trailing_slash(self):
        """Should strip trailing slash from endpoint."""
        collector = PrometheusCollector("http://prometheus.test/")

        assert collector.endpoint == "http://prometheus.test"

    def test_stores_endpoint(self):
        """Should store the endpoint."""
        collector = PrometheusCollector("http://promtest:9090")

        assert collector.endpoint == "http://promtest:9090"


class TestPrometheusGetHighLevelSummary:
    """Tests for PrometheusCollector.get_high_level_summary."""

    @pytest.fixture
    def collector(self):
        return PrometheusCollector("http://prometheus.test")

    async def test_returns_zero_counts_when_no_alerts(self, collector):
        """Should return zero alert counts when nothing is firing."""
        collector._get_alerts = AsyncMock(return_value=[])

        result = await collector.get_high_level_summary()

        assert result["available"] is True
        assert result["total_firing"] == 0
        assert result["active_alerts"]["critical"] == 0
        assert result["active_alerts"]["warning"] == 0
        assert result["active_alerts"]["info"] == 0

    async def test_counts_critical_alerts(self, collector):
        """Should count critical-severity firing alerts."""
        alerts = [
            _make_alert("CPUHigh", "critical"),
            _make_alert("DiskFull", "critical"),
        ]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_high_level_summary()

        assert result["active_alerts"]["critical"] == 2
        assert result["total_firing"] == 2

    async def test_counts_warning_alerts(self, collector):
        """Should count warning-severity firing alerts."""
        alerts = [_make_alert("MemoryHigh", "warning")]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_high_level_summary()

        assert result["active_alerts"]["warning"] == 1

    async def test_ignores_pending_alerts(self, collector):
        """Should not count alerts that are in pending state."""
        alerts = [
            _make_alert("CPUHigh", "critical", state="pending"),
        ]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_high_level_summary()

        assert result["total_firing"] == 0

    async def test_top_alerts_capped_at_five(self, collector):
        """Should include at most 5 alerts in top_alerts."""
        alerts = [_make_alert(f"Alert{i}", "warning") for i in range(10)]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_high_level_summary()

        assert len(result["top_alerts"]) == 5

    async def test_unknown_severity_bucketed_as_info(self, collector):
        """Alerts with unknown severity should be counted in the info bucket."""
        alerts = [_make_alert("WeirdAlert", "unknown_severity")]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_high_level_summary()

        assert result["active_alerts"]["info"] == 1

    async def test_returns_error_when_request_fails(self, collector):
        """Should return error dict when Prometheus is unreachable."""
        collector._get_alerts = AsyncMock(
            side_effect=httpx.ConnectError("refused")
        )

        result = await collector.get_high_level_summary()

        assert result["available"] is False
        assert "error" in result


class TestPrometheusGetDetailedData:
    """Tests for PrometheusCollector.get_detailed_data."""

    @pytest.fixture
    def collector(self):
        return PrometheusCollector("http://prometheus.test")

    async def test_executes_raw_promql(self, collector):
        """Should query Prometheus with provided PromQL expression."""
        collector._query = AsyncMock(return_value=[{"metric": {}, "value": [0, "1"]}])

        result = await collector.get_detailed_data({"promql": "up"})

        assert result == {"result": [{"metric": {}, "value": [0, "1"]}]}
        collector._query.assert_called_once_with("up")

    async def test_builds_metric_query_from_name(self, collector):
        """Should build and execute a PromQL query from metric name."""
        collector._query = AsyncMock(return_value=[])

        await collector.get_detailed_data({"metric": "container_cpu_usage_seconds_total"})

        call_args = collector._query.call_args[0][0]
        assert "container_cpu_usage_seconds_total" in call_args

    async def test_builds_metric_query_with_labels(self, collector):
        """Should include label selectors in generated PromQL."""
        collector._query = AsyncMock(return_value=[])

        await collector.get_detailed_data({
            "metric": "http_requests_total",
            "labels": {"namespace": "default"},
        })

        call_args = collector._query.call_args[0][0]
        assert 'namespace="default"' in call_args

    async def test_falls_back_to_all_alerts_without_query(self, collector):
        """Should list firing alerts when no specific query is provided."""
        alerts = [_make_alert("SomeAlert", "warning")]
        collector._get_alerts = AsyncMock(return_value=alerts)

        result = await collector.get_detailed_data({})

        assert "alerts" in result
        assert len(result["alerts"]) == 1

    async def test_returns_error_dict_on_promql_failure(self, collector):
        """Should return error dict when PromQL query fails."""
        collector._query = AsyncMock(side_effect=Exception("Query error"))

        result = await collector.get_detailed_data({"promql": "bad_query{"})

        assert "error" in result

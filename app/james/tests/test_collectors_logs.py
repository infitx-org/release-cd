"""Unit tests for src/collectors/logs.py."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from src.collectors.logs import LogsCollector


class TestLogsCollectorInit:
    """Tests for LogsCollector initialisation."""

    def test_strips_trailing_slash(self):
        """Should strip trailing slash from loki_endpoint."""
        collector = LogsCollector("http://loki.test/")

        assert collector.loki_endpoint == "http://loki.test"

    def test_stores_empty_string_when_no_endpoint(self):
        """Should store empty string when endpoint is None."""
        collector = LogsCollector(None)

        assert collector.loki_endpoint == ""


class TestLogsGetHighLevelSummary:
    """Tests for LogsCollector.get_high_level_summary."""

    async def test_returns_unavailable_when_no_endpoint(self):
        """Should return unavailable when Loki endpoint is not configured."""
        collector = LogsCollector(None)

        result = await collector.get_high_level_summary()

        assert result["available"] is False
        assert "message" in result

    async def test_returns_service_error_counts_when_available(self):
        """Should parse error counts per service from Loki response."""
        collector = LogsCollector("http://loki.test")
        loki_data = {
            "data": {
                "result": [
                    {"metric": {"app": "my-service"}, "value": [0, "42"]},
                    {"metric": {"app": "other-service"}, "value": [0, "7"]},
                ]
            }
        }

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=loki_data)

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch.object(collector, "_client", return_value=mock_client):
            result = await collector.get_high_level_summary()

        assert result["available"] is True
        assert result["services_with_errors"] == 2

    async def test_excludes_services_with_zero_errors(self):
        """Should not include services that have zero errors."""
        collector = LogsCollector("http://loki.test")
        loki_data = {
            "data": {
                "result": [
                    {"metric": {"app": "good-service"}, "value": [0, "0"]},
                    {"metric": {"app": "bad-service"}, "value": [0, "5"]},
                ]
            }
        }

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=loki_data)

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch.object(collector, "_client", return_value=mock_client):
            result = await collector.get_high_level_summary()

        assert result["services_with_errors"] == 1

    async def test_top_error_services_capped_at_5(self):
        """Should limit the top error services list to 5 entries."""
        collector = LogsCollector("http://loki.test")
        results = [
            {"metric": {"app": f"svc-{i}"}, "value": [0, str(i + 1)]}
            for i in range(10)
        ]
        loki_data = {"data": {"result": results}}

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json = MagicMock(return_value=loki_data)

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch.object(collector, "_client", return_value=mock_client):
            result = await collector.get_high_level_summary()

        assert len(result["top_error_services"]) <= 5

    async def test_returns_error_when_loki_unreachable(self):
        """Should return unavailable dict when Loki is unreachable."""
        collector = LogsCollector("http://loki.test")

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with patch.object(collector, "_client", return_value=mock_client):
            result = await collector.get_high_level_summary()

        assert result["available"] is False
        assert "error" in result


class TestLogsGetDetailedData:
    """Tests for LogsCollector.get_detailed_data."""

    async def test_returns_unavailable_when_no_endpoint(self):
        """Should return unavailable when Loki endpoint is not configured."""
        collector = LogsCollector(None)

        result = await collector.get_detailed_data({})

        assert result["available"] is False

    async def test_builds_app_label_selector(self):
        """Should include app label in the Loki query when app is specified."""
        collector = LogsCollector("http://loki.test")
        captured_params = {}

        async def mock_get(url, **kwargs):
            captured_params.update(kwargs.get("params", {}))
            mock_resp = MagicMock()
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json = MagicMock(return_value={
                "data": {"result": []}
            })
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=mock_get)

        with patch.object(collector, "_client", return_value=mock_client):
            await collector.get_detailed_data({"app": "my-service"})

        query_str = captured_params.get("query", "")
        assert 'app="my-service"' in query_str

    async def test_builds_namespace_label_selector(self):
        """Should include namespace label in the Loki query when namespace is specified."""
        collector = LogsCollector("http://loki.test")
        captured_params = {}

        async def mock_get(url, **kwargs):
            captured_params.update(kwargs.get("params", {}))
            mock_resp = MagicMock()
            mock_resp.raise_for_status = MagicMock()
            mock_resp.json = MagicMock(return_value={"data": {"result": []}})
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=mock_get)

        with patch.object(collector, "_client", return_value=mock_client):
            await collector.get_detailed_data({"namespace": "production"})

        query_str = captured_params.get("query", "")
        assert 'namespace="production"' in query_str

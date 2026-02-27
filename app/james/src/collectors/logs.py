"""Logs collector using Loki API."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from src.collectors.base import DataCollector

logger = logging.getLogger(__name__)


class LogsCollector(DataCollector):
    """Collector for application logs via Loki or Kubernetes logs API."""

    def __init__(self, loki_endpoint: Optional[str] = None):
        self.loki_endpoint = (loki_endpoint or "").rstrip("/")

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0)

    async def get_high_level_summary(self) -> Dict[str, Any]:
        if not self.loki_endpoint:
            return {"available": False, "message": "Loki endpoint not configured"}

        try:
            # Count recent errors across services
            error_query = 'sum by (app) (count_over_time({job=~".+"} |= "error" [15m]))'
            async with self._client() as client:
                resp = await client.get(
                    f"{self.loki_endpoint}/loki/api/v1/query",
                    params={"query": error_query},
                )
                resp.raise_for_status()
                data = resp.json()
                results = data.get("data", {}).get("result", [])

            error_services = [
                {
                    "app": r["metric"].get("app", "unknown"),
                    "error_count": int(float(r["value"][1])),
                }
                for r in results
                if float(r["value"][1]) > 0
            ]

            return {
                "available": True,
                "services_with_errors": len(error_services),
                "top_error_services": sorted(
                    error_services, key=lambda x: x["error_count"], reverse=True
                )[:5],
            }
        except Exception as e:
            logger.warning(f"Loki summary failed: {e}")
            return {"available": False, "error": str(e)}

    async def get_detailed_data(self, query: Dict[str, Any]) -> Dict[str, Any]:
        if not self.loki_endpoint:
            return {"available": False}

        app = query.get("app") or query.get("pod_name", "")
        namespace = query.get("namespace", "")
        pattern = query.get("pattern", "")
        limit = query.get("limit", 100)
        time_range = query.get("time_range", "1h")

        label_selectors = []
        if app:
            label_selectors.append(f'app="{app}"')
        if namespace:
            label_selectors.append(f'namespace="{namespace}"')

        if not label_selectors:
            label_selectors.append('job=~".+"')

        log_query = "{" + ",".join(label_selectors) + "}"
        if pattern:
            log_query += f' |= "{pattern}"'

        try:
            async with self._client() as client:
                resp = await client.get(
                    f"{self.loki_endpoint}/loki/api/v1/query_range",
                    params={
                        "query": log_query,
                        "limit": limit,
                        "start": f"now-{time_range}",
                        "end": "now",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                streams = data.get("data", {}).get("result", [])
                logs = []
                for stream in streams:
                    for entry in stream.get("values", []):
                        logs.append(
                            {
                                "timestamp": entry[0],
                                "message": entry[1],
                                "labels": stream.get("stream", {}),
                            }
                        )
                return {"logs": logs, "count": len(logs)}
        except Exception as e:
            return {"error": str(e)}

    async def get_recent_anomalies(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        if not self.loki_endpoint:
            return []

        anomalies = []
        error_patterns = [
            ("panic", "critical"),
            ("fatal", "critical"),
            ("OOMKilled", "critical"),
            ("exception", "high"),
            ("error", "medium"),
        ]

        for pattern, severity in error_patterns:
            try:
                log_query = '{job=~".+"} |~ "(?i)' + pattern + '"'
                async with self._client() as client:
                    resp = await client.get(
                        f"{self.loki_endpoint}/loki/api/v1/query_range",
                        params={
                            "query": log_query,
                            "limit": 20,
                            "start": f"now-{time_range}",
                            "end": "now",
                        },
                    )
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    streams = data.get("data", {}).get("result", [])
                    for stream in streams:
                        for entry in stream.get("values", [])[:5]:
                            anomalies.append(
                                {
                                    "type": "log_error",
                                    "severity": severity,
                                    "pattern": pattern,
                                    "message": entry[1][:200],
                                    "labels": stream.get("stream", {}),
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                }
                            )
            except Exception as e:
                logger.debug(f"Log anomaly check for '{pattern}' failed: {e}")

        return anomalies

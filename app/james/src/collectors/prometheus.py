"""Prometheus metrics and alerts collector."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

import httpx

from src.collectors.base import DataCollector

logger = logging.getLogger(__name__)


class PrometheusCollector(DataCollector):
    """Collector for Prometheus metrics and active alerts."""

    def __init__(self, endpoint: str):
        self.endpoint = endpoint.rstrip("/")

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=10.0)

    async def _query(self, promql: str) -> List[Dict]:
        async with self._client() as client:
            resp = await client.get(
                f"{self.endpoint}/api/v1/query",
                params={"query": promql},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", {}).get("result", [])

    async def _get_alerts(self) -> List[Dict]:
        async with self._client() as client:
            resp = await client.get(f"{self.endpoint}/api/v1/alerts")
            resp.raise_for_status()
            return resp.json().get("data", {}).get("alerts", [])

    async def get_high_level_summary(self) -> Dict[str, Any]:
        try:
            alerts = await self._get_alerts()
        except Exception as e:
            logger.warning(f"Prometheus alerts failed: {e}")
            return {"error": str(e), "available": False}

        firing = [a for a in alerts if a.get("state") == "firing"]
        by_severity: Dict[str, int] = {"critical": 0, "warning": 0, "info": 0}
        top_alerts = []

        for alert in firing:
            sev = alert.get("labels", {}).get("severity", "info").lower()
            if sev in by_severity:
                by_severity[sev] += 1
            else:
                by_severity["info"] += 1

            if len(top_alerts) < 5:
                top_alerts.append(
                    {
                        "name": alert.get("labels", {}).get("alertname", "unknown"),
                        "severity": sev,
                        "summary": alert.get("annotations", {}).get("summary", ""),
                        "labels": alert.get("labels", {}),
                    }
                )

        return {
            "available": True,
            "active_alerts": by_severity,
            "top_alerts": top_alerts,
            "total_firing": len(firing),
        }

    async def get_detailed_data(self, query: Dict[str, Any]) -> Dict[str, Any]:
        if "promql" in query:
            try:
                result = await self._query(query["promql"])
                return {"result": result}
            except Exception as e:
                return {"error": str(e)}

        if "metric" in query:
            labels = query.get("labels", {})
            label_str = ",".join(f'{k}="{v}"' for k, v in labels.items())
            promql = f"{query['metric']}{{{label_str}}}" if label_str else query["metric"]
            try:
                result = await self._query(promql)
                return {"result": result}
            except Exception as e:
                return {"error": str(e)}

        # Default: return all firing alerts
        try:
            alerts = await self._get_alerts()
            return {"alerts": [a for a in alerts if a.get("state") == "firing"]}
        except Exception as e:
            return {"error": str(e)}

    async def get_recent_anomalies(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        anomalies = []
        try:
            alerts = await self._get_alerts()
            for alert in alerts:
                if alert.get("state") != "firing":
                    continue
                sev = alert.get("labels", {}).get("severity", "info").lower()
                anomalies.append(
                    {
                        "type": "firing_alert",
                        "severity": sev if sev in ("critical", "high", "warning") else "info",
                        "name": alert.get("labels", {}).get("alertname", "unknown"),
                        "message": alert.get("annotations", {}).get("summary", ""),
                        "labels": alert.get("labels", {}),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
        except Exception as e:
            logger.warning(f"Prometheus anomaly check failed: {e}")

        # Check for error rate spikes
        try:
            spikes = await self._detect_error_spikes()
            anomalies.extend(spikes)
        except Exception as e:
            logger.warning(f"Error spike detection failed: {e}")

        return anomalies

    async def _detect_error_spikes(self) -> List[Dict[str, Any]]:
        """Detect services with increased 5xx error rates."""
        current_q = 'rate(http_requests_total{status=~"5.."}[5m])'
        baseline_q = 'rate(http_requests_total{status=~"5.."}[5m] offset 1h)'

        current = await self._query(current_q)
        baseline = await self._query(baseline_q)

        baseline_by_service = {
            m["metric"].get("service", "unknown"): float(m["value"][1])
            for m in baseline
        }

        spikes = []
        for metric in current:
            service = metric["metric"].get("service", "unknown")
            curr_val = float(metric["value"][1])
            base_val = baseline_by_service.get(service, 0)

            if curr_val > 0 and (base_val == 0 or curr_val > base_val * 2):
                spikes.append(
                    {
                        "type": "error_rate_spike",
                        "severity": "high",
                        "service": service,
                        "message": f"Error rate increased: baseline={base_val:.4f}, current={curr_val:.4f}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )

        return spikes

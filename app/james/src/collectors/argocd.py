"""ArgoCD data collector."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from src.collectors.base import DataCollector

logger = logging.getLogger(__name__)


class ArgoCDCollector(DataCollector):
    """Collector for ArgoCD application health and sync status."""

    def __init__(self, endpoint: str, token: Optional[str] = None, insecure: bool = False):
        self.endpoint = endpoint.rstrip("/")
        self.token = token
        self.insecure = insecure
        self._headers = {}
        if token:
            self._headers["Authorization"] = f"Bearer {token}"

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers=self._headers,
            verify=not self.insecure,
            timeout=10.0,
        )

    async def _list_applications(self, namespace: Optional[str] = None) -> List[Dict]:
        params = {}
        if namespace:
            params["appNamespace"] = namespace
        async with self._client() as client:
            resp = await client.get(f"{self.endpoint}/api/v1/applications", params=params)
            resp.raise_for_status()
            return resp.json().get("items", [])

    async def get_high_level_summary(self) -> Dict[str, Any]:
        try:
            apps = await self._list_applications()
        except Exception as e:
            logger.warning(f"ArgoCD summary failed: {e}")
            return {"error": str(e), "available": False}

        summary: Dict[str, Any] = {
            "available": True,
            "total_apps": len(apps),
            "healthy": 0,
            "degraded": 0,
            "missing": 0,
            "unknown": 0,
            "out_of_sync": 0,
            "recent_sync_failures": [],
        }

        for app in apps:
            health = app.get("status", {}).get("health", {}).get("status", "Unknown")
            sync = app.get("status", {}).get("sync", {}).get("status", "Unknown")

            if health == "Healthy":
                summary["healthy"] += 1
            elif health == "Degraded":
                summary["degraded"] += 1
            elif health == "Missing":
                summary["missing"] += 1
            else:
                summary["unknown"] += 1

            if sync == "OutOfSync":
                summary["out_of_sync"] += 1
                summary["recent_sync_failures"].append(
                    {"app": app["metadata"]["name"], "sync_status": sync}
                )

        return summary

    async def get_detailed_data(self, query: Dict[str, Any]) -> Dict[str, Any]:
        app_name = query.get("app_name")
        if app_name:
            try:
                async with self._client() as client:
                    resp = await client.get(
                        f"{self.endpoint}/api/v1/applications/{app_name}"
                    )
                    resp.raise_for_status()
                    return resp.json()
            except Exception as e:
                return {"error": str(e)}

        apps = await self._list_applications(namespace=query.get("namespace"))
        return {"apps": apps}

    async def get_recent_anomalies(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        anomalies = []
        try:
            apps = await self._list_applications()
        except Exception as e:
            logger.warning(f"ArgoCD anomaly check failed: {e}")
            return []

        for app in apps:
            name = app["metadata"]["name"]
            health = app.get("status", {}).get("health", {}).get("status", "Unknown")
            sync = app.get("status", {}).get("sync", {}).get("status", "Unknown")
            health_msg = app.get("status", {}).get("health", {}).get("message", "")

            if health in ("Degraded", "Missing"):
                anomalies.append(
                    {
                        "type": "app_unhealthy",
                        "severity": "high",
                        "app_name": name,
                        "health_status": health,
                        "message": health_msg or f"Application is {health}",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )

            if sync == "OutOfSync":
                anomalies.append(
                    {
                        "type": "out_of_sync",
                        "severity": "medium",
                        "app_name": name,
                        "message": "Application is out of sync with desired state",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )

        return anomalies

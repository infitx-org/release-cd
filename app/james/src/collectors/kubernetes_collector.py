"""Kubernetes resources collector."""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.collectors.base import DataCollector

logger = logging.getLogger(__name__)


class KubernetesCollector(DataCollector):
    """Collector for Kubernetes pod, deployment, and event data."""

    def __init__(self):
        self._core_v1 = None
        self._apps_v1 = None

    def _get_clients(self):
        if self._core_v1 is None:
            from kubernetes import client, config as k8s_config
            try:
                k8s_config.load_incluster_config()
            except Exception:
                k8s_config.load_kube_config()
            self._core_v1 = client.CoreV1Api()
            self._apps_v1 = client.AppsV1Api()
        return self._core_v1, self._apps_v1

    async def get_high_level_summary(self) -> Dict[str, Any]:
        try:
            core, apps = self._get_clients()
            pods = core.list_pod_for_all_namespaces(watch=False)
        except Exception as e:
            logger.warning(f"K8s summary failed: {e}")
            return {"error": str(e), "available": False}

        summary: Dict[str, Any] = {
            "available": True,
            "total_pods": len(pods.items),
            "running": 0,
            "pending": 0,
            "failed": 0,
            "succeeded": 0,
            "crashlooping": 0,
            "oom_killed": 0,
            "recent_events": [],
            "deployment_issues": [],
        }

        for pod in pods.items:
            phase = (pod.status.phase or "Unknown")
            if phase == "Running":
                summary["running"] += 1
                if self._is_crashlooping(pod):
                    summary["crashlooping"] += 1
            elif phase == "Pending":
                summary["pending"] += 1
            elif phase == "Failed":
                summary["failed"] += 1
            elif phase == "Succeeded":
                summary["succeeded"] += 1

            for cs in pod.status.container_statuses or []:
                if (
                    cs.last_state
                    and cs.last_state.terminated
                    and cs.last_state.terminated.reason == "OOMKilled"
                ):
                    summary["oom_killed"] += 1

        # Recent warning events
        try:
            events = core.list_event_for_all_namespaces(
                watch=False,
                field_selector="type=Warning",
            )
            for event in sorted(
                events.items,
                key=lambda e: e.last_timestamp or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )[:10]:
                summary["recent_events"].append(
                    {
                        "namespace": event.metadata.namespace,
                        "resource": event.involved_object.name,
                        "reason": event.reason,
                        "message": event.message,
                        "timestamp": (
                            event.last_timestamp.isoformat()
                            if event.last_timestamp
                            else None
                        ),
                    }
                )
        except Exception as e:
            logger.warning(f"K8s events failed: {e}")

        # Deployment issues
        try:
            deployments = apps.list_deployment_for_all_namespaces(watch=False)
            for dep in deployments.items:
                desired = dep.spec.replicas or 0
                ready = (dep.status.ready_replicas or 0)
                if ready < desired:
                    summary["deployment_issues"].append(
                        {
                            "namespace": dep.metadata.namespace,
                            "name": dep.metadata.name,
                            "desired": desired,
                            "ready": ready,
                        }
                    )
        except Exception as e:
            logger.warning(f"K8s deployments check failed: {e}")

        return summary

    async def get_detailed_data(self, query: Dict[str, Any]) -> Dict[str, Any]:
        namespace = query.get("namespace", "default")
        resource_type = query.get("resource_type", "pods")
        core, apps = self._get_clients()

        try:
            if resource_type == "pods":
                pod_name = query.get("pod_name")
                if pod_name:
                    pod = core.read_namespaced_pod(name=pod_name, namespace=namespace)
                    return {"pod": pod.to_dict()}
                pods = core.list_namespaced_pod(
                    namespace=namespace,
                    label_selector=query.get("label_selector", ""),
                )
                return {"pods": [p.to_dict() for p in pods.items]}

            if resource_type == "events":
                resource_name = query.get("resource_name")
                field_selector = ""
                if resource_name:
                    field_selector = f"involvedObject.name={resource_name}"
                events = core.list_namespaced_event(
                    namespace=namespace,
                    field_selector=field_selector,
                )
                return {"events": [e.to_dict() for e in events.items]}

            if resource_type == "logs":
                pod_name = query.get("pod_name", "")
                container = query.get("container")
                tail_lines = query.get("tail_lines", 100)
                logs = core.read_namespaced_pod_log(
                    name=pod_name,
                    namespace=namespace,
                    container=container,
                    tail_lines=tail_lines,
                )
                return {"logs": logs}

        except Exception as e:
            return {"error": str(e)}

        return {}

    async def get_recent_anomalies(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        anomalies = []
        try:
            core, _ = self._get_clients()

            # Failed / OOMKilled pods
            pods = core.list_pod_for_all_namespaces(watch=False)
            for pod in pods.items:
                if pod.status.phase == "Failed":
                    anomalies.append(
                        {
                            "type": "pod_failure",
                            "severity": "high",
                            "namespace": pod.metadata.namespace,
                            "pod_name": pod.metadata.name,
                            "reason": pod.status.reason,
                            "message": pod.status.message or "Pod failed",
                            "timestamp": (
                                pod.status.start_time.isoformat()
                                if pod.status.start_time
                                else datetime.now(timezone.utc).isoformat()
                            ),
                        }
                    )

                for cs in pod.status.container_statuses or []:
                    if self._is_crashlooping_cs(cs):
                        anomalies.append(
                            {
                                "type": "crash_loop",
                                "severity": "critical",
                                "namespace": pod.metadata.namespace,
                                "pod_name": pod.metadata.name,
                                "container": cs.name,
                                "restart_count": cs.restart_count,
                                "message": "Container is in CrashLoopBackOff",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                        )
                    elif (
                        cs.last_state
                        and cs.last_state.terminated
                        and cs.last_state.terminated.reason == "OOMKilled"
                    ):
                        anomalies.append(
                            {
                                "type": "oom_killed",
                                "severity": "critical",
                                "namespace": pod.metadata.namespace,
                                "pod_name": pod.metadata.name,
                                "container": cs.name,
                                "message": "Container was OOMKilled",
                                "timestamp": (
                                    cs.last_state.terminated.finished_at.isoformat()
                                    if cs.last_state.terminated.finished_at
                                    else datetime.now(timezone.utc).isoformat()
                                ),
                            }
                        )

            # Warning events
            events = core.list_event_for_all_namespaces(
                watch=False, field_selector="type=Warning"
            )
            for event in events.items:
                anomalies.append(
                    {
                        "type": "k8s_warning",
                        "severity": "medium",
                        "namespace": event.metadata.namespace,
                        "resource": event.involved_object.name,
                        "reason": event.reason,
                        "message": event.message,
                        "count": event.count,
                        "timestamp": (
                            event.last_timestamp.isoformat()
                            if event.last_timestamp
                            else datetime.now(timezone.utc).isoformat()
                        ),
                    }
                )

        except Exception as e:
            logger.warning(f"K8s anomaly check failed: {e}")

        return anomalies

    def _is_crashlooping(self, pod) -> bool:
        for cs in pod.status.container_statuses or []:
            if self._is_crashlooping_cs(cs):
                return True
        return False

    def _is_crashlooping_cs(self, cs) -> bool:
        return bool(
            cs.state
            and cs.state.waiting
            and cs.state.waiting.reason == "CrashLoopBackOff"
        )

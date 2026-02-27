"""LangGraph-based investigation workflow orchestrator."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from src.api.models import (
    Finding,
    FindingSeverity,
    InvestigationResponse,
    InvestigationStatus,
    InvestigationStep,
)
from src.agents.prompts import (
    ANALYZE_SUMMARY_PROMPT,
    FORMULATE_FINDINGS_PROMPT,
    DECIDE_NEXT_STEP_PROMPT,
)

logger = logging.getLogger(__name__)


class InvestigationOrchestrator:
    """Orchestrates multi-step AI investigations using LangGraph."""

    def __init__(self, settings, argocd, prometheus, kubernetes, logs, mcp_manager=None):
        self.settings = settings
        self.argocd = argocd
        self.prometheus = prometheus
        self.kubernetes = kubernetes
        self.logs = logs
        self.mcp_manager = mcp_manager
        self._investigations: Dict[str, InvestigationResponse] = {}
        self._llm = None

    def _get_llm(self):
        if self._llm is None:
            try:
                from langchain_openai import ChatOpenAI
                self._llm = ChatOpenAI(
                    model=self.settings.llm_model,
                    api_key=self.settings.openai_api_key,
                    base_url=self.settings.llm_endpoint,
                    temperature=0,
                )
            except Exception as e:
                logger.warning(f"LLM init failed: {e}. Will use heuristic analysis only.")
        return self._llm

    async def investigate(
        self, question: str, context: Dict[str, Any]
    ) -> InvestigationResponse:
        """Run a full investigation workflow."""
        inv_id = f"inv-{uuid4().hex[:12]}"
        investigation = InvestigationResponse(
            investigation_id=inv_id,
            status=InvestigationStatus.running,
            question=question,
            context=context,
        )
        self._investigations[inv_id] = investigation

        try:
            await self._run_investigation(investigation, context)
        except Exception as e:
            logger.error(f"Investigation {inv_id} failed: {e}", exc_info=True)
            investigation.status = InvestigationStatus.failed
            investigation.summary = f"Investigation failed: {str(e)}"

        investigation.completed_at = datetime.now(timezone.utc)
        return investigation

    async def get_investigation(self, investigation_id: str) -> Optional[InvestigationResponse]:
        return self._investigations.get(investigation_id)

    async def _run_investigation(
        self,
        investigation: InvestigationResponse,
        context: Dict[str, Any],
    ):
        steps = investigation.steps
        max_steps = self.settings.max_investigation_steps

        # Step 1: Collect high-level data from all sources
        step1 = InvestigationStep(step_number=1, action="collect_high_level_data")
        high_level = await self._collect_high_level(context)
        step1.result = high_level
        steps.append(step1)
        investigation.initial_findings = {
            k: v for k, v in high_level.items() if not isinstance(v, dict) or len(str(v)) < 500
        }

        # Step 2: AI analysis of collected data
        step2 = InvestigationStep(step_number=2, action="analyze_findings")
        analysis = await self._analyze_summary(investigation.question, high_level)
        step2.result = analysis
        steps.append(step2)

        # Step 3: Search knowledge base for similar incidents
        step3 = InvestigationStep(step_number=3, action="search_knowledge_base")
        kb_results = await self._search_knowledge(investigation.question, analysis)
        step3.result = {"knowledge_matches": kb_results}
        steps.append(step3)

        # Step 4: K8sGPT analysis via MCP (if available)
        current_step = 4
        if self.mcp_manager:
            step4 = InvestigationStep(step_number=current_step, action="k8sgpt_mcp_analysis")
            step4.result = await self._collect_mcp_insights(investigation.investigation_id)
            steps.append(step4)
            current_step += 1

        # Steps 4/5-N: Targeted collection based on analysis
        anomalies = analysis.get("anomalies", [])
        drill_down_targets = analysis.get("drill_down_targets", [])

        for target in drill_down_targets[:max_steps - current_step]:
            step = InvestigationStep(
                step_number=current_step,
                action=f"collect_detailed_{target.get('source', 'unknown')}",
            )
            detail = await self._collect_detailed(target)
            step.result = detail
            steps.append(step)
            current_step += 1

        # Final step: formulate findings
        final_step = InvestigationStep(step_number=current_step, action="formulate_findings")
        all_data = {
            "question": investigation.question,
            "high_level": high_level,
            "analysis": analysis,
            "knowledge_base": kb_results,
            "mcp_insights": next(
                (s.result for s in steps if s.action == "k8sgpt_mcp_analysis"), {}
            ),
            "detailed_data": [s.result for s in steps[3:current_step - 1]],
        }
        findings = await self._formulate_findings(all_data, anomalies)
        final_step.result = {"findings_count": len(findings)}
        steps.append(final_step)

        investigation.findings = findings
        investigation.status = InvestigationStatus.completed
        investigation.summary = self._build_summary(findings)

    async def _collect_high_level(self, context: Dict) -> Dict[str, Any]:
        namespace = context.get("namespace")

        results = await asyncio.gather(
            self.argocd.get_high_level_summary(),
            self.prometheus.get_high_level_summary(),
            self.kubernetes.get_high_level_summary(),
            self.logs.get_high_level_summary(),
            return_exceptions=True,
        )

        return {
            "argocd": results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])},
            "prometheus": results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])},
            "kubernetes": results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])},
            "logs": results[3] if not isinstance(results[3], Exception) else {"error": str(results[3])},
            "namespace": namespace,
        }

    async def _analyze_summary(self, question: str, data: Dict) -> Dict:
        llm = self._get_llm()
        if llm is None:
            return self._heuristic_analysis(data)

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            prompt = ANALYZE_SUMMARY_PROMPT.format(
                question=question,
                data=json.dumps(data, default=str, indent=2)[:4000],
            )
            response = await llm.ainvoke([
                SystemMessage(content="You are an expert Kubernetes SRE."),
                HumanMessage(content=prompt),
            ])
            # Parse JSON from LLM response
            content = response.content
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except Exception as e:
            logger.warning(f"LLM analysis failed: {e}")

        return self._heuristic_analysis(data)

    def _heuristic_analysis(self, data: Dict) -> Dict:
        """Fallback heuristic analysis when LLM is unavailable."""
        anomalies = []
        drill_down = []

        k8s = data.get("kubernetes", {})
        if k8s.get("failed", 0) > 0 or k8s.get("crashlooping", 0) > 0:
            anomalies.append("Pod failures or crash loops detected")
            drill_down.append({"source": "kubernetes", "resource_type": "events"})

        prom = data.get("prometheus", {})
        alerts = prom.get("active_alerts", {})
        if alerts.get("critical", 0) > 0:
            anomalies.append(f"{alerts['critical']} critical alerts firing")
            drill_down.append({"source": "prometheus", "promql": "ALERTS{severity='critical'}"})

        argocd = data.get("argocd", {})
        if argocd.get("degraded", 0) > 0 or argocd.get("failed", 0) > 0:
            anomalies.append("ArgoCD applications degraded or failed")
            drill_down.append({"source": "argocd"})

        return {
            "anomalies": anomalies,
            "drill_down_targets": drill_down,
            "hypothesis": "Multiple anomalies detected - investigate specific components",
        }

    async def _search_knowledge(self, question: str, analysis: Dict) -> List[Dict]:
        if not self.settings.copilot_spaces_enabled:
            return []
        try:
            from src.integrations.copilot_spaces import CopilotSpacesClient
            client = CopilotSpacesClient(
                endpoint=self.settings.copilot_spaces_endpoint,
                token=self.settings.github_token,
            )
            query = f"{question} {' '.join(analysis.get('anomalies', []))}"
            return await client.search_knowledge(query, top_k=3)
        except Exception as e:
            logger.warning(f"Knowledge search failed: {e}")
            return []

    async def _collect_mcp_insights(self, investigation_id: str) -> Dict:
        """Call k8sgpt MCP tools to collect cluster analysis insights."""
        tools = self.mcp_manager.create_langchain_tools(investigation_id)
        results = {}
        for tool in tools:
            if tool.name in ("analyze", "k8sgpt_analyze"):
                try:
                    results["k8sgpt_analysis"] = await tool._arun()
                except Exception as e:
                    results["k8sgpt_analysis_error"] = str(e)
        return results

    async def _collect_detailed(self, target: Dict) -> Dict:
        source = target.get("source", "")
        collector_map = {
            "argocd": self.argocd,
            "prometheus": self.prometheus,
            "kubernetes": self.kubernetes,
            "logs": self.logs,
        }
        collector = collector_map.get(source)
        if not collector:
            return {}
        try:
            return await collector.get_detailed_data(target)
        except Exception as e:
            return {"error": str(e)}

    async def _formulate_findings(
        self, all_data: Dict, anomalies: List[str]
    ) -> List[Finding]:
        llm = self._get_llm()
        if llm and self.settings.openai_api_key:
            try:
                from langchain_core.messages import HumanMessage, SystemMessage
                prompt = FORMULATE_FINDINGS_PROMPT.format(
                    data=json.dumps(all_data, default=str, indent=2)[:5000],
                )
                response = await llm.ainvoke([
                    SystemMessage(content="You are an expert Kubernetes SRE. Return JSON."),
                    HumanMessage(content=prompt),
                ])
                content = response.content
                start = content.find("[")
                end = content.rfind("]") + 1
                if start >= 0 and end > start:
                    raw_findings = json.loads(content[start:end])
                    return [
                        Finding(
                            severity=f.get("severity", "medium"),
                            component=f.get("component", "unknown"),
                            title=f.get("title", "Issue detected"),
                            description=f.get("description", ""),
                            evidence=f.get("evidence", []),
                            potential_causes=f.get("potential_causes", []),
                            recommendations=f.get("recommendations", []),
                            confidence=f.get("confidence", 0.5),
                        )
                        for f in raw_findings
                    ]
            except Exception as e:
                logger.warning(f"LLM findings formulation failed: {e}")

        # Heuristic findings from anomalies
        findings = []
        for anomaly in anomalies:
            findings.append(
                Finding(
                    severity=FindingSeverity.medium,
                    component="cluster",
                    title=anomaly,
                    description=anomaly,
                    evidence=[anomaly],
                    potential_causes=["Configuration issue", "Resource constraint", "External dependency"],
                    recommendations=["Investigate logs", "Check resource limits", "Review recent changes"],
                    confidence=0.5,
                )
            )
        return findings

    def _build_summary(self, findings: List[Finding]) -> str:
        if not findings:
            return "No significant issues detected."
        critical = [f for f in findings if f.severity in ("critical", "high")]
        if critical:
            return f"Found {len(critical)} critical/high severity issue(s): " + "; ".join(
                f.title for f in critical[:3]
            )
        return f"Found {len(findings)} issue(s): " + "; ".join(f.title for f in findings[:3])

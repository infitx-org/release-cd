"""Prompt templates for the AI investigation agent."""

ANALYZE_SUMMARY_PROMPT = """You are analyzing cluster health data to investigate an issue.

Question: {question}

Cluster health data:
{data}

Analyze this data and return a JSON object with:
{{
  "anomalies": ["list of detected anomalies as strings"],
  "hypothesis": "primary hypothesis for root cause",
  "drill_down_targets": [
    {{"source": "kubernetes|argocd|prometheus|logs", "resource_type": "...", "namespace": "...", "pod_name": "..."}}
  ],
  "severity": "critical|high|medium|low"
}}

Focus on:
- Failed or crashlooping pods
- OOMKilled containers
- Firing critical/warning alerts
- Degraded ArgoCD applications
- High error rates in logs
- Recent warning events

Return only valid JSON."""


FORMULATE_FINDINGS_PROMPT = """You are an expert SRE formulating investigation findings.

Investigation data:
{data}

Based on the collected data, return a JSON array of findings:
[
  {{
    "severity": "critical|high|medium|low|info",
    "component": "kubernetes|argocd|prometheus|logs|network",
    "title": "Short title of the finding",
    "description": "Detailed description of what was found",
    "evidence": ["list of specific evidence items"],
    "potential_causes": ["list of potential root causes"],
    "recommendations": ["list of actionable recommendations"],
    "confidence": 0.0-1.0
  }}
]

Guidelines:
- Prioritize findings by severity
- Be specific and actionable in recommendations
- Include concrete evidence from the data
- Set confidence based on strength of evidence

Return only valid JSON array."""


DECIDE_NEXT_STEP_PROMPT = """Based on the current investigation state, decide the next step.

Question: {question}
Current findings: {findings}
Steps taken: {steps_taken}
Max steps remaining: {steps_remaining}

Decide what additional data to collect. Return JSON:
{{
  "action": "collect_detailed|search_knowledge|formulate_findings",
  "target": {{
    "source": "kubernetes|argocd|prometheus|logs",
    "resource_type": "pods|events|logs|deployments",
    "namespace": "optional-namespace",
    "pod_name": "optional-pod-name",
    "promql": "optional-promql-query"
  }},
  "reason": "Why this step is needed"
}}

If no more data is needed, set action to "formulate_findings".
Return only valid JSON."""

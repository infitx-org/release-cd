"""FastAPI routes for AI Agent service."""
import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from src.api.models import (
    CollectRequest,
    HealthSummaryResponse,
    InvestigateRequest,
    InvestigationResponse,
    InvestigationStatus,
    KnowledgeSearchRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def get_orchestrator(request: Request):
    return request.app.state.orchestrator


def get_collectors(request: Request):
    return {
        "argocd": request.app.state.argocd,
        "prometheus": request.app.state.prometheus,
        "kubernetes": request.app.state.kubernetes,
        "logs": request.app.state.logs,
    }


# Health check endpoints (no auth required)
@router.get("/healthz", tags=["health"])
async def liveness():
    return {"status": "ok"}


@router.get("/readyz", tags=["health"])
async def readiness(request: Request):
    try:
        # Quick check on collectors
        collectors = get_collectors(request)
        return {"status": "ok", "collectors": list(collectors.keys())}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


# --- Investigation endpoints ---

@router.post("/v1/investigate", response_model=InvestigationResponse, tags=["investigations"])
async def start_investigation(
    body: InvestigateRequest,
    orchestrator=Depends(get_orchestrator),
):
    """Start an autonomous investigation."""
    logger.info(f"Starting investigation: {body.question}")
    try:
        result = await orchestrator.investigate(
            question=body.question,
            context=body.context or {},
        )
        return result
    except Exception as e:
        logger.error(f"Investigation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/v1/investigations/{investigation_id}",
    response_model=InvestigationResponse,
    tags=["investigations"],
)
async def get_investigation(
    investigation_id: str,
    orchestrator=Depends(get_orchestrator),
):
    """Get investigation status and results."""
    result = await orchestrator.get_investigation(investigation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return result


# --- Health summary endpoint ---

@router.get("/v1/health/summary", response_model=HealthSummaryResponse, tags=["health"])
async def get_health_summary(collectors=Depends(get_collectors)):
    """Get high-level cluster health overview from all collectors."""
    try:
        argocd_summary = await collectors["argocd"].get_high_level_summary()
        prom_summary = await collectors["prometheus"].get_high_level_summary()
        k8s_summary = await collectors["kubernetes"].get_high_level_summary()

        # Determine overall health
        overall = "healthy"
        if (
            argocd_summary.get("failed", 0) > 0
            or prom_summary.get("active_alerts", {}).get("critical", 0) > 0
            or k8s_summary.get("failed", 0) > 0
        ):
            overall = "failed"
        elif (
            argocd_summary.get("degraded", 0) > 0
            or prom_summary.get("active_alerts", {}).get("warning", 0) > 0
            or k8s_summary.get("pending", 0) > 0
        ):
            overall = "degraded"

        recent_issues = k8s_summary.get("recent_events", [])[:5]

        return HealthSummaryResponse(
            overall_health=overall,
            components={
                "argocd": argocd_summary,
                "prometheus": prom_summary,
                "kubernetes": k8s_summary,
            },
            recent_issues=recent_issues,
        )
    except Exception as e:
        logger.error(f"Health summary failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Detailed collection endpoints ---

@router.post("/v1/collect/{source}", tags=["collect"])
async def collect_from_source(
    source: str,
    body: CollectRequest,
    collectors=Depends(get_collectors),
) -> Dict[str, Any]:
    """Detailed data collection from a specific source."""
    if source not in collectors:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{source}'. Valid: {list(collectors.keys())}",
        )
    try:
        collector = collectors[source]
        query = {**(body.query or {}), "time_range": body.time_range}
        result = await collector.get_detailed_data(query)
        return {"source": source, "data": result}
    except Exception as e:
        logger.error(f"Collection from {source} failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Knowledge base endpoint ---

@router.get("/v1/knowledge/search", tags=["knowledge"])
async def search_knowledge(
    q: str,
    top_k: int = 5,
    request: Request = None,
) -> Dict[str, Any]:
    """Search the knowledge base for similar issues."""
    try:
        settings = request.app.state.settings
        if not settings.copilot_spaces_enabled:
            return {"results": [], "message": "Knowledge base not enabled"}

        from src.integrations.copilot_spaces import CopilotSpacesClient
        client = CopilotSpacesClient(
            endpoint=settings.copilot_spaces_endpoint,
            token=settings.github_token,
        )
        results = await client.search_knowledge(q, top_k=top_k)
        return {"results": results}
    except Exception as e:
        logger.error(f"Knowledge search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Slack webhook endpoints ---

@router.post("/slack/events", tags=["slack"], include_in_schema=False)
async def slack_events(request: Request):
    """Handle incoming Slack events."""
    if not hasattr(request.app.state, "slack_bot"):
        raise HTTPException(status_code=503, detail="Slack bot not configured")
    return await request.app.state.slack_bot.handler.handle(request)


@router.post("/slack/interactive", tags=["slack"], include_in_schema=False)
async def slack_interactive(request: Request):
    """Handle Slack interactive components."""
    if not hasattr(request.app.state, "slack_bot"):
        raise HTTPException(status_code=503, detail="Slack bot not configured")
    return await request.app.state.slack_bot.handler.handle(request)

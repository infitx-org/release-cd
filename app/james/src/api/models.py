"""Pydantic models for API request/response."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class InvestigationStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class FindingSeverity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class InvestigateRequest(BaseModel):
    question: str = Field(..., description="The investigation question")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional context: namespace, time_range, etc.",
    )


class Finding(BaseModel):
    severity: FindingSeverity
    component: str
    title: str
    description: str
    evidence: List[str] = Field(default_factory=list)
    potential_causes: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class InvestigationStep(BaseModel):
    step_number: int
    action: str
    result: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InvestigationResponse(BaseModel):
    investigation_id: str = Field(default_factory=lambda: f"inv-{uuid4().hex[:12]}")
    status: InvestigationStatus
    question: str
    context: Optional[Dict[str, Any]] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    steps: List[InvestigationStep] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    summary: Optional[str] = None
    initial_findings: Optional[Dict[str, Any]] = None


class HealthComponentStatus(BaseModel):
    status: str
    details: Optional[Dict[str, Any]] = None


class HealthSummaryResponse(BaseModel):
    overall_health: str
    components: Dict[str, Any]
    recent_issues: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class CollectRequest(BaseModel):
    query: Optional[Dict[str, Any]] = Field(default_factory=dict)
    time_range: str = Field(default="1h")


class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)

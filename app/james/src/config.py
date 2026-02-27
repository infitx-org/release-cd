"""Configuration management for AI Agent."""
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # ArgoCD
    argocd_endpoint: str = Field(
        default="https://argocd-server.argocd.svc.cluster.local",
        alias="ARGOCD_ENDPOINT",
    )
    argocd_token: Optional[str] = Field(default=None, alias="ARGOCD_TOKEN")
    argocd_insecure: bool = Field(default=False, alias="ARGOCD_INSECURE")

    # Prometheus
    prometheus_endpoint: str = Field(
        default="http://prom-kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
        alias="PROMETHEUS_ENDPOINT",
    )

    # Loki
    loki_endpoint: str = Field(
        default="http://loki.logging.svc.cluster.local:3100",
        alias="LOKI_ENDPOINT",
    )

    # LLM
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    llm_model: str = Field(default="gpt-4o", alias="LLM_MODEL")
    llm_endpoint: str = Field(default="https://api.openai.com/v1", alias="LLM_ENDPOINT")
    embedding_model: str = Field(default="text-embedding-ada-002", alias="EMBEDDING_MODEL")

    # GitHub
    github_token: Optional[str] = Field(default=None, alias="GITHUB_TOKEN")
    copilot_spaces_enabled: bool = Field(default=False, alias="COPILOT_SPACES_ENABLED")
    copilot_spaces_endpoint: str = Field(
        default="https://api.githubcopilot.com/spaces",
        alias="COPILOT_SPACES_ENDPOINT",
    )

    # Slack
    slack_enabled: bool = Field(default=False, alias="SLACK_ENABLED")
    slack_bot_token: Optional[str] = Field(default=None, alias="SLACK_BOT_TOKEN")
    slack_app_token: Optional[str] = Field(default=None, alias="SLACK_APP_TOKEN")
    slack_channel: str = Field(default="incidents", alias="SLACK_CHANNEL")
    slack_thread_replies: bool = Field(default=True, alias="SLACK_THREAD_REPLIES")

    # Agent
    max_investigation_steps: int = Field(default=5, alias="MAX_INVESTIGATION_STEPS")
    investigation_timeout: int = Field(default=300, alias="INVESTIGATION_TIMEOUT")

    # Redis
    redis_enabled: bool = Field(default=False, alias="REDIS_ENABLED")
    redis_url: str = Field(
        default="redis://redis-master.redis.svc.cluster.local:6379",
        alias="REDIS_URL",
    )

    # ChromaDB
    chromadb_path: str = Field(default="/app/data/chromadb", alias="CHROMADB_PATH")

    # MCP
    mcp_enabled: bool = Field(default=False, alias="MCP_ENABLED")
    mcp_auth_token: Optional[str] = Field(default=None, alias="MCP_AUTH_TOKEN")
    mcp_db_connection: Optional[str] = Field(default=None, alias="MCP_DB_CONNECTION")
    mcp_git_token: Optional[str] = Field(default=None, alias="MCP_GIT_TOKEN")
    mcp_k8sgpt_enabled: bool = Field(default=True, alias="MCP_K8SGPT_ENABLED")
    mcp_k8sgpt_url: str = Field(
        default="http://k8sgpt-mcp.ai-agent.svc.cluster.local:8089/sse",
        alias="MCP_K8SGPT_URL",
    )

    # API authentication
    api_token: Optional[str] = Field(default=None, alias="API_TOKEN")


@lru_cache
def get_settings() -> Settings:
    return Settings()

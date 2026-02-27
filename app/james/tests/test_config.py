"""Unit tests for src/config.py."""
import pytest
from unittest.mock import patch

from src.config import Settings, get_settings


class TestSettings:
    """Tests for the Settings configuration class."""

    def test_default_values(self):
        """Should use sensible defaults when no env vars are set."""
        settings = Settings()

        assert settings.log_level == "INFO"
        assert settings.argocd_endpoint == "https://argocd-server.argocd.svc.cluster.local"
        assert settings.argocd_token is None
        assert settings.argocd_insecure is False
        assert settings.llm_model == "gpt-4o"
        assert settings.max_investigation_steps == 5
        assert settings.investigation_timeout == 300
        assert settings.slack_enabled is False
        assert settings.mcp_enabled is False
        assert settings.redis_enabled is False
        assert settings.copilot_spaces_enabled is False

    def test_env_var_overrides(self):
        """Should respect environment variable overrides via aliases."""
        settings = Settings(
            LOG_LEVEL="DEBUG",
            ARGOCD_ENDPOINT="http://argocd.custom",
            ARGOCD_TOKEN="my-token",
            ARGOCD_INSECURE=True,
            MAX_INVESTIGATION_STEPS=10,
            SLACK_ENABLED=True,
        )

        assert settings.log_level == "DEBUG"
        assert settings.argocd_endpoint == "http://argocd.custom"
        assert settings.argocd_token == "my-token"
        assert settings.argocd_insecure is True
        assert settings.max_investigation_steps == 10
        assert settings.slack_enabled is True

    def test_optional_fields_default_to_none(self):
        """Optional credential fields should default to None."""
        settings = Settings()

        assert settings.openai_api_key is None
        assert settings.github_token is None
        assert settings.slack_bot_token is None
        assert settings.slack_app_token is None
        assert settings.argocd_token is None
        assert settings.api_token is None
        assert settings.mcp_auth_token is None

    def test_prometheus_default_endpoint(self):
        """Prometheus endpoint should have a working default."""
        settings = Settings()

        assert "prometheus" in settings.prometheus_endpoint
        assert ":9090" in settings.prometheus_endpoint

    def test_loki_default_endpoint(self):
        """Loki endpoint should have a working default."""
        settings = Settings()

        assert "loki" in settings.loki_endpoint
        assert ":3100" in settings.loki_endpoint

    def test_mcp_k8sgpt_defaults(self):
        """MCP k8sgpt settings should have working defaults."""
        settings = Settings()

        assert settings.mcp_k8sgpt_enabled is True
        assert ":8089/sse" in settings.mcp_k8sgpt_url


class TestGetSettings:
    """Tests for the get_settings factory function."""

    def test_returns_settings_instance(self):
        """Should return a Settings object."""
        # Clear the lru_cache so we get a fresh instance
        get_settings.cache_clear()
        result = get_settings()

        assert isinstance(result, Settings)

    def test_is_cached(self):
        """Should return the same instance on repeated calls."""
        get_settings.cache_clear()
        first = get_settings()
        second = get_settings()

        assert first is second

    def teardown_method(self):
        """Clear lru_cache after each test to avoid polluting other tests."""
        get_settings.cache_clear()

"""Unit tests for src/utils/logging.py."""
import logging

import pytest

from src.utils.logging import setup_logging


class TestSetupLogging:
    """Tests for setup_logging utility."""

    def setup_method(self):
        """Remove all root logger handlers so basicConfig takes effect each test."""
        root = logging.getLogger()
        root.handlers = []
        root.setLevel(logging.WARNING)

    def teardown_method(self):
        """Reset root logger level after each test."""
        root = logging.getLogger()
        root.handlers = []
        root.setLevel(logging.WARNING)

    def test_sets_info_level_by_default(self):
        """Should configure root logger to INFO when 'INFO' is passed."""
        setup_logging("INFO")

        assert logging.getLogger().level == logging.INFO

    def test_sets_debug_level(self):
        """Should configure root logger to DEBUG when 'DEBUG' is passed."""
        setup_logging("DEBUG")

        assert logging.getLogger().level == logging.DEBUG

    def test_sets_warning_level(self):
        """Should configure root logger to WARNING when 'WARNING' is passed."""
        setup_logging("WARNING")

        assert logging.getLogger().level == logging.WARNING

    def test_accepts_lowercase_level(self):
        """Should accept lowercase log level strings."""
        setup_logging("debug")

        assert logging.getLogger().level == logging.DEBUG

    def test_invalid_level_falls_back_to_info(self):
        """Should fall back to INFO level when an invalid level string is given."""
        setup_logging("NOT_A_LEVEL")

        # getattr(logging, 'NOT_A_LEVEL', logging.INFO) returns logging.INFO
        assert logging.getLogger().level == logging.INFO

    def test_quietens_httpx_logger(self):
        """Should set httpx logger to WARNING or above."""
        setup_logging("DEBUG")

        assert logging.getLogger("httpx").level >= logging.WARNING

    def test_quietens_kubernetes_logger(self):
        """Should set kubernetes logger to WARNING or above."""
        setup_logging("DEBUG")

        assert logging.getLogger("kubernetes").level >= logging.WARNING

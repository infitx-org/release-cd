"""Logging configuration."""
import logging
import sys


def setup_logging(level: str = "INFO"):
    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
    )
    # Explicitly set root logger level — basicConfig is a no-op when handlers
    # are already configured (e.g. in test environments), so always apply the
    # level directly to the root logger as well.
    logging.getLogger().setLevel(log_level)
    # Quieten noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("kubernetes").setLevel(logging.WARNING)

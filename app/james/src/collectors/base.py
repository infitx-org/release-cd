"""Abstract base class for all data collectors."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List


class DataCollector(ABC):
    """Base class for all data collectors."""

    @abstractmethod
    async def get_high_level_summary(self) -> Dict[str, Any]:
        """Return high-level health/status overview. Should complete in < 2s."""

    @abstractmethod
    async def get_detailed_data(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Return detailed data based on specific query."""

    @abstractmethod
    async def get_recent_anomalies(self, time_range: str = "1h") -> List[Dict[str, Any]]:
        """Return detected anomalies in the specified time range."""

    async def health_check(self) -> bool:
        """Check if the collector is reachable."""
        try:
            await self.get_high_level_summary()
            return True
        except Exception:
            return False

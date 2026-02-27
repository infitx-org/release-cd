"""GitHub Copilot Spaces client for RAG-based knowledge retrieval."""
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class CopilotSpacesClient:
    """Client for GitHub Copilot Spaces knowledge base queries."""

    def __init__(self, endpoint: str, token: Optional[str] = None):
        self.endpoint = endpoint.rstrip("/")
        self.token = token
        self._headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if token:
            self._headers["Authorization"] = f"Bearer {token}"

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(headers=self._headers, timeout=15.0)

    async def search_knowledge(
        self, query: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search knowledge base using RAG."""
        try:
            async with self._client() as client:
                resp = await client.post(
                    f"{self.endpoint}/search",
                    json={"query": query, "top_k": top_k},
                )
                if resp.status_code == 404:
                    # Endpoint may not exist - try alternative
                    return await self._search_via_chat(query, top_k)
                resp.raise_for_status()
                data = resp.json()
                return data.get("results", [])
        except httpx.HTTPStatusError:
            return await self._search_via_chat(query, top_k)
        except Exception as e:
            logger.warning(f"Copilot Spaces search failed: {e}")
            return []

    async def _search_via_chat(
        self, query: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Alternative: query via chat completions with context."""
        try:
            async with self._client() as client:
                resp = await client.post(
                    "https://api.githubcopilot.com/chat/completions",
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a knowledge base for Kubernetes troubleshooting. "
                                    f"Find the top {top_k} most relevant past incidents or solutions "
                                    "for the given query. Return JSON array."
                                ),
                            },
                            {"role": "user", "content": query},
                        ],
                    },
                )
                resp.raise_for_status()
                # Return as structured results
                content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                return [{"source": "copilot_spaces", "content": content, "score": 0.8}]
        except Exception as e:
            logger.warning(f"Copilot Spaces chat search failed: {e}")
            return []

    async def get_similar_incidents(
        self, symptoms: List[str]
    ) -> List[Dict[str, Any]]:
        """Find similar past incidents based on symptoms."""
        query = "Similar incident with symptoms: " + "; ".join(symptoms)
        return await self.search_knowledge(query, top_k=3)

    async def ask_question(
        self, question: str, context: Optional[Dict] = None
    ) -> str:
        """Ask a general question with optional context."""
        try:
            ctx_str = ""
            if context:
                import json
                ctx_str = f"\n\nContext: {json.dumps(context, default=str)[:1000]}"

            async with self._client() as client:
                resp = await client.post(
                    "https://api.githubcopilot.com/chat/completions",
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert Kubernetes SRE assistant.",
                            },
                            {"role": "user", "content": question + ctx_str},
                        ],
                    },
                )
                resp.raise_for_status()
                return (
                    resp.json()
                    .get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
        except Exception as e:
            logger.warning(f"Copilot Spaces question failed: {e}")
            return ""

"""MCP (Model Context Protocol) client manager with access control."""
import json
import logging
import time
from typing import Dict, List, Optional

import aiofiles

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple token-bucket rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: List[float] = []

    async def allow_request(self) -> bool:
        now = time.monotonic()
        # Remove old requests outside the window
        self._requests = [t for t in self._requests if now - t < self.window_seconds]
        if len(self._requests) < self.max_requests:
            self._requests.append(now)
            return True
        return False


class AccessResult:
    def __init__(self, granted: bool, reason: str = ""):
        self.granted = granted
        self.reason = reason


# Permission model: maps tool name prefixes to required permissions
_WRITE_PREFIXES = ("write_", "create_", "delete_", "insert", "update", "git_commit", "git_push")


def _is_write_operation(tool_name: str) -> bool:
    return any(tool_name.lower().startswith(p) for p in _WRITE_PREFIXES)


class MCPAccessControl:
    """Access control for MCP server operations."""

    def __init__(self, servers_config: List[Dict]):
        self._config: Dict[str, Dict] = {s["name"]: s for s in servers_config if s.get("name")}
        self._server_tools: Dict[str, List] = {}
        self._rate_limiters: Dict[str, RateLimiter] = {}

    def register_server_tools(self, server_name: str, tools: List):
        self._server_tools[server_name] = tools

    def get_server_tools(self, server_name: str) -> List:
        return self._server_tools.get(server_name, [])

    def check_access(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict,
    ) -> AccessResult:
        cfg = self._config.get(server_name)
        if not cfg:
            return AccessResult(False, "Server not configured")
        if not cfg.get("enabled", True):
            return AccessResult(False, "Server disabled")

        allowed_perms = cfg.get("permissions", [])
        if "write" not in allowed_perms and _is_write_operation(tool_name):
            return AccessResult(False, "Write operations not allowed")

        server_cfg = cfg.get("config", {})

        # Filesystem path restriction
        if cfg.get("type") == "filesystem":
            path = arguments.get("path", "")
            allowed_paths = server_cfg.get("allowedPaths", [])
            if allowed_paths and not any(path.startswith(p) for p in allowed_paths):
                return AccessResult(False, f"Path '{path}' not in allowed paths")

        # Database schema restriction
        elif cfg.get("type") == "postgres":
            query = arguments.get("query", "").lower()
            allowed_schemas = server_cfg.get("allowedSchemas", [])
            if allowed_schemas and not any(s.lower() in query for s in allowed_schemas):
                return AccessResult(False, "Query accesses disallowed schema")

        # Git repository restriction
        elif cfg.get("type") == "git":
            repo = arguments.get("repository", "")
            allowed = [r["name"] for r in server_cfg.get("repositories", [])]
            if allowed and repo not in allowed:
                return AccessResult(False, f"Repository '{repo}' not allowed")

        return AccessResult(True, "Access granted")

    async def check_rate_limit(self, server_name: str) -> bool:
        if server_name not in self._rate_limiters:
            cfg = self._config.get(server_name, {})
            rate_limit = cfg.get("rateLimit", 100)
            self._rate_limiters[server_name] = RateLimiter(rate_limit)
        return await self._rate_limiters[server_name].allow_request()


class MCPAuditLogger:
    """Structured audit logging for all MCP operations."""

    AUDIT_LOG = "/var/log/ai-agent/mcp-audit.log"

    async def log_tool_call(
        self,
        *,
        server_name: str,
        tool_name: str,
        arguments: Dict,
        investigation_id: str,
        success: bool,
        result_size: int = 0,
        error: Optional[str] = None,
    ):
        entry = {
            "ts": time.time(),
            "investigation_id": investigation_id,
            "server": server_name,
            "tool": tool_name,
            "args_keys": list(arguments.keys()),
            "success": success,
            "result_size": result_size,
            "error": error,
        }
        try:
            async with aiofiles.open(self.AUDIT_LOG, "a") as f:
                await f.write(json.dumps(entry) + "\n")
        except Exception:
            logger.debug("MCP audit log write failed", exc_info=True)

    async def log_access_denied(
        self, server_name: str, tool_name: str, reason: str, investigation_id: str
    ):
        await self.log_tool_call(
            server_name=server_name,
            tool_name=tool_name,
            arguments={},
            investigation_id=investigation_id,
            success=False,
            error=f"ACCESS_DENIED: {reason}",
        )


class MCPClientManager:
    """Manages MCP server connections via langchain_mcp_adapters, with access control and audit logging."""

    def __init__(self, servers_config: List[Dict]):
        self.servers_config = servers_config
        self.access_control = MCPAccessControl(servers_config)
        self.audit_logger = MCPAuditLogger()
        self._client = None

    def _build_adapter_config(self) -> Dict:
        """Convert servers_config list to MultiServerMCPClient dict format."""
        config = {}
        for server in self.servers_config:
            name = server.get("name")
            if not name or not server.get("enabled", True):
                continue
            transport = server.get("transport", "stdio")
            if transport == "sse":
                config[name] = {
                    "url": server["url"],
                    "transport": "sse",
                    "headers": server.get("headers", {}),
                }
            else:
                config[name] = {
                    "command": server.get("serverPath", server.get("type", "")),
                    "args": server.get("args", []),
                    "env": server.get("env", {}),
                    "transport": "stdio",
                }
        return config

    async def initialize(self):
        """Start all configured MCP servers."""
        try:
            from langchain_mcp_adapters.client import MultiServerMCPClient
        except ImportError:
            logger.warning("langchain_mcp_adapters not available; MCP tools disabled")
            return

        adapter_config = self._build_adapter_config()
        if not adapter_config:
            return

        try:
            self._client = MultiServerMCPClient(adapter_config)
            await self._client.__aenter__()
            for server_name in adapter_config:
                tools = self._client.get_tools(server_name=server_name)
                self.access_control.register_server_tools(server_name, tools)
            logger.info(f"MCP: initialized {len(adapter_config)} server(s)")
        except Exception as e:
            logger.error(f"MCP initialization failed: {e}")
            self._client = None

    async def close(self):
        """Shut down all MCP server connections."""
        if self._client is not None:
            try:
                await self._client.__aexit__(None, None, None)
            except Exception:
                pass
            self._client = None

    def create_langchain_tools(self, investigation_id: str) -> List:
        """Return access-controlled LangChain tools for all connected MCP servers."""
        if self._client is None:
            return []

        tools = []
        for server in self.servers_config:
            server_name = server.get("name")
            if not server_name:
                continue
            try:
                server_tools = self._client.get_tools(server_name=server_name)
            except Exception as e:
                logger.warning(f"Could not get tools for MCP server '{server_name}': {e}")
                continue
            for tool in server_tools:
                tools.append(self._wrap_tool(tool, server_name, investigation_id))

        return tools

    def _wrap_tool(self, tool, server_name: str, investigation_id: str):
        """Wrap an adapter tool with access control and audit logging."""
        from langchain_core.tools import StructuredTool

        _mgr = self
        _server_name = server_name
        _tool_name = tool.name
        _inv_id = investigation_id
        _inner = tool._arun

        async def _controlled_arun(*args, **kwargs):
            access = _mgr.access_control.check_access(_server_name, _tool_name, kwargs)
            if not access.granted:
                await _mgr.audit_logger.log_access_denied(
                    _server_name, _tool_name, access.reason, _inv_id
                )
                return f"Access denied: {access.reason}"

            if not await _mgr.access_control.check_rate_limit(_server_name):
                return f"Rate limit exceeded for MCP server '{_server_name}'"

            try:
                result = await _inner(*args, **kwargs)
                await _mgr.audit_logger.log_tool_call(
                    server_name=_server_name,
                    tool_name=_tool_name,
                    arguments=kwargs,
                    investigation_id=_inv_id,
                    success=True,
                    result_size=len(str(result)),
                )
                return result
            except Exception as e:
                await _mgr.audit_logger.log_tool_call(
                    server_name=_server_name,
                    tool_name=_tool_name,
                    arguments=kwargs,
                    investigation_id=_inv_id,
                    success=False,
                    error=str(e),
                )
                raise

        return StructuredTool(
            name=tool.name,
            description=tool.description,
            args_schema=tool.args_schema,
            coroutine=_controlled_arun,
        )

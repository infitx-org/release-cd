"""Slack bot integration using Slack Bolt for Python."""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class SlackBot:
    """Slack Bot for AI Agent interaction via slash commands and mentions."""

    def __init__(self, bot_token: str, app_token: Optional[str], orchestrator):
        from slack_bolt.async_app import AsyncApp
        from slack_bolt.adapter.fastapi.async_handler import AsyncSlackRequestHandler

        self.orchestrator = orchestrator
        self.app = AsyncApp(token=bot_token)
        self.handler = AsyncSlackRequestHandler(self.app)

        self._register_commands()
        self._register_events()
        self._register_actions()

    def _register_commands(self):
        @self.app.command("/agent")
        async def handle_agent_command(ack, command, client):
            await ack()
            text = command["text"].strip()
            channel_id = command["channel_id"]

            if text.lower().startswith("investigate"):
                question = text[len("investigate"):].strip()
                await self._handle_investigate(client, channel_id, question)
            elif text.lower() == "health":
                await self._handle_health(client, channel_id)
            elif text.lower().startswith("status"):
                inv_id = text[len("status"):].strip()
                await self._handle_status(client, channel_id, inv_id)
            else:
                await client.chat_postMessage(
                    channel=channel_id,
                    text=(
                        "Unknown command. Try:\n"
                        "• `/agent investigate <question>` - Start investigation\n"
                        "• `/agent health` - Cluster health summary\n"
                        "• `/agent status <id>` - Check investigation status"
                    ),
                )

    def _register_events(self):
        @self.app.event("app_mention")
        async def handle_mention(event, client):
            channel_id = event["channel"]
            text = event["text"]
            thread_ts = event.get("thread_ts", event["ts"])

            # Strip bot mention from message
            import re
            question = re.sub(r"<@[A-Z0-9]+>", "", text).strip()
            if question:
                await self._handle_investigate(client, channel_id, question, thread_ts)

    def _register_actions(self):
        @self.app.action("view_full_report")
        async def handle_view_report(ack, action, client, body):
            await ack()
            investigation_id = action["value"]
            result = await self.orchestrator.get_investigation(investigation_id)
            if result:
                channel_id = body["channel"]["id"]
                await client.chat_postMessage(
                    channel=channel_id,
                    text=f"Full report for {investigation_id}",
                    blocks=self._format_investigation_results(result.dict()),
                )

        @self.app.action("reinvestigate")
        async def handle_reinvestigate(ack, action, client, body):
            await ack()
            investigation_id = action["value"]
            result = await self.orchestrator.get_investigation(investigation_id)
            if result:
                channel_id = body["channel"]["id"]
                await self._handle_investigate(client, channel_id, result.question)

        @self.app.action("get_logs")
        async def handle_get_logs(ack, action, client, body):
            await ack()
            investigation_id = action["value"]
            result = await self.orchestrator.get_investigation(investigation_id)
            if result:
                channel_id = body["channel"]["id"]
                steps_with_logs = [
                    s for s in result.steps if "logs" in s.action.lower()
                ]
                text = "No log data available in this investigation."
                if steps_with_logs:
                    log_data = steps_with_logs[-1].result or {}
                    text = f"Log data:\n```{str(log_data)[:2000]}```"
                await client.chat_postMessage(channel=channel_id, text=text)

    async def _handle_investigate(
        self,
        client,
        channel_id: str,
        question: str,
        thread_ts: Optional[str] = None,
    ):
        if not question:
            await client.chat_postMessage(
                channel=channel_id,
                text="Please provide a question to investigate.",
                thread_ts=thread_ts,
            )
            return

        # Post initial message
        response = await client.chat_postMessage(
            channel=channel_id,
            thread_ts=thread_ts,
            text=f"🔍 Starting investigation: _{question}_",
        )
        message_ts = response["ts"]

        # Run investigation
        result = await self.orchestrator.investigate(question=question, context={})

        # Post results in thread
        await client.chat_postMessage(
            channel=channel_id,
            thread_ts=thread_ts or message_ts,
            text="✅ Investigation complete",
            blocks=self._format_investigation_results(result.dict()),
        )

    async def _handle_health(self, client, channel_id: str):
        from src.collectors.argocd import ArgoCDCollector
        # Get health from orchestrator's collectors
        orc = self.orchestrator
        argocd_data = await orc.argocd.get_high_level_summary()
        prom_data = await orc.prometheus.get_high_level_summary()
        k8s_data = await orc.kubernetes.get_high_level_summary()

        health = {
            "overall_health": "healthy",
            "components": {
                "argocd": argocd_data,
                "prometheus": prom_data,
                "kubernetes": k8s_data,
            },
        }

        await client.chat_postMessage(
            channel=channel_id,
            text="📊 Cluster Health",
            blocks=self._format_health_summary(health),
        )

    async def _handle_status(self, client, channel_id: str, investigation_id: str):
        result = await self.orchestrator.get_investigation(investigation_id)
        if not result:
            await client.chat_postMessage(
                channel=channel_id,
                text=f"Investigation `{investigation_id}` not found.",
            )
            return
        await client.chat_postMessage(
            channel=channel_id,
            text=f"Investigation `{investigation_id}`: *{result.status}*\n{result.summary or ''}",
        )

    def _format_investigation_results(self, result: Dict[str, Any]) -> list:
        findings = result.get("findings", [])
        severity_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢", "info": "⚪"}

        blocks: list = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "✅ Investigation Complete"},
            }
        ]

        for finding in findings[:5]:
            sev = finding.get("severity", "info")
            evidence = "\n".join(f"• {e}" for e in finding.get("evidence", [])[:3])
            recs = "\n".join(f"• {r}" for r in finding.get("recommendations", [])[:3])
            confidence = finding.get("confidence", 0)
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"{severity_emoji.get(sev, '⚪')} *{finding.get('title')}*\n"
                            f"_{finding.get('description')}_\n\n"
                            f"*Evidence:*\n{evidence or 'N/A'}\n\n"
                            f"*Recommendations:*\n{recs or 'N/A'}\n\n"
                            f"Confidence: {confidence * 100:.0f}%"
                        ),
                    },
                }
            )

        blocks.append(
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View Full Report"},
                        "action_id": "view_full_report",
                        "value": result.get("investigation_id", ""),
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Re-investigate"},
                        "action_id": "reinvestigate",
                        "value": result.get("investigation_id", ""),
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Get Logs"},
                        "action_id": "get_logs",
                        "value": result.get("investigation_id", ""),
                    },
                ],
            }
        )

        return blocks

    def _format_health_summary(self, health: Dict[str, Any]) -> list:
        argocd = health["components"].get("argocd", {})
        prom = health["components"].get("prometheus", {})
        k8s = health["components"].get("kubernetes", {})

        return [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "📊 Cluster Health Summary"},
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": (
                            f"*ArgoCD*\n✅ {argocd.get('healthy', 0)} healthy, "
                            f"⚠️ {argocd.get('degraded', 0)} degraded"
                        ),
                    },
                    {
                        "type": "mrkdwn",
                        "text": (
                            f"*Prometheus*\n🔴 {prom.get('active_alerts', {}).get('critical', 0)} critical, "
                            f"🟡 {prom.get('active_alerts', {}).get('warning', 0)} warnings"
                        ),
                    },
                    {
                        "type": "mrkdwn",
                        "text": (
                            f"*Kubernetes*\n▶️ {k8s.get('running', 0)}/{k8s.get('total_pods', 0)} pods running"
                        ),
                    },
                ],
            },
        ]

    async def post_alert_notification(
        self, channel_id: str, alert: Dict, investigation_result: Dict
    ):
        """Post a critical alert with investigation findings to Slack."""
        findings = investigation_result.get("findings", [])
        top_finding = findings[0] if findings else {}

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"🚨 Critical Alert: {alert.get('name')}"},
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Service:*\n{alert.get('service', 'unknown')}"},
                    {"type": "mrkdwn", "text": f"*Severity:*\n{alert.get('severity', 'unknown')}"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"🤖 *AI Analysis:*\n"
                        f"{top_finding.get('title', 'Investigation in progress')}\n"
                        f"Confidence: {top_finding.get('confidence', 0) * 100:.0f}%"
                    ),
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View Investigation"},
                        "action_id": "view_full_report",
                        "value": investigation_result.get("investigation_id", ""),
                    }
                ],
            },
        ]

        response = await self.app.client.chat_postMessage(
            channel=channel_id,
            text=f"🚨 Critical Alert: {alert.get('name')}",
            blocks=blocks,
        )
        await self.app.client.chat_postMessage(
            channel=channel_id,
            thread_ts=response["ts"],
            text="Full investigation results",
            blocks=self._format_investigation_results(investigation_result),
        )

    async def start(self):
        """Start the Slack bot in Socket Mode if app_token is configured."""
        try:
            from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
            settings = self.orchestrator.settings
            if settings.slack_app_token:
                handler = AsyncSocketModeHandler(self.app, settings.slack_app_token)
                await handler.start_async()
        except Exception as e:
            logger.warning(f"Slack Socket Mode start failed: {e}")

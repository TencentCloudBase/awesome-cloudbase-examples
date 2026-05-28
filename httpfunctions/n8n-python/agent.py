# -*- coding: utf-8 -*-
import os
from typing import Optional

from cloudbase_agent.n8n import N8nAgent


def build_n8n_agent(
    webhook_url: Optional[str] = None,
    timeout: Optional[int] = None,
) -> N8nAgent:
    final_webhook_url = webhook_url or os.environ.get("N8N_WEBHOOK_URL")

    if not final_webhook_url:
        raise ValueError(
            "N8N_WEBHOOK_URL is required. "
            "Set it via argument or environment variable."
        )

    agent = N8nAgent(
        name="agentic_chat",
        description="A conversational chatbot agent powered by n8n workflow",
        webhook_url=final_webhook_url,
        timeout=timeout,
        # If your n8n webhook has authentication enabled (Basic Auth recommended),
        # pass the appropriate headers:
        #
        # Basic Auth (recommended, easiest to configure in n8n):
        #   headers={"Authorization": f"Basic {base64.b64encode(b'user:pass').decode()}"},
        #
        # Also supports Header Auth and JWT Auth via the same mechanism.
    )

    return agent

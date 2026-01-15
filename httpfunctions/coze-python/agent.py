"""Agentic Chat Agent Implementation.

This module implements a conversational chat agent using Coze platform
integrated with AG-Kit. The agent uses Coze Chat V3 API for interactions
and supports streaming responses, reasoning content, and custom parameters.

Environment variables are expected to be set by the deployment environment
(Docker, cloud platforms, etc.) rather than using .env files.
"""

import os
from typing import Optional

from cozepy import Coze

from cloudbase_agent.coze import CozeAgent


def build_coze_agent(
    bot_id: Optional[str] = None,
    user_id: Optional[str] = None,
    parameters: Optional[dict] = None,
) -> CozeAgent:
    """Build and return a Coze agent instance.

    This factory function creates a CozeAgent instance configured with
    environment variables or explicit parameters. The agent is created fresh
    for each conversation to ensure proper isolation.

    Parameters
    ----------
    bot_id : Optional[str]
        Bot ID for Coze conversations. If not provided, will use COZE_BOT_ID
        environment variable.
    user_id : Optional[str]
        User ID for Coze conversations. If not provided, will use COZE_USER_ID
        environment variable.
    parameters : Optional[dict]
        Optional parameters for Coze chat API (e.g., temperature, max_tokens).
        Can also be set via COZE_PARAMETERS environment variable as JSON string.

    Returns
    -------
    CozeAgent
        Configured Coze agent instance ready for use.

    Example
    -------
    Creating a Coze agent::

        from agents.agentic_chat.agent import build_coze_agent

        agent = build_coze_agent()

        # Or with explicit parameters
        agent = build_coze_agent(
            bot_id="your-bot-id",
            user_id="your-user-id",
            parameters={"temperature": 0.7}
        )
    """
    # Use provided parameters or fall back to environment variables
    final_bot_id = bot_id or os.environ.get("COZE_BOT_ID")
    final_user_id = user_id or os.environ.get("COZE_USER_ID")

    # Parse parameters from environment if not provided
    final_parameters = parameters
    if final_parameters is None and os.environ.get("COZE_PARAMETERS"):
        import json

        try:
            final_parameters = json.loads(os.environ.get("COZE_PARAMETERS", "{}"))
        except json.JSONDecodeError:
            # If parsing fails, use empty dict
            final_parameters = {}

    agent = CozeAgent(
        name="agentic_chat",
        description="A conversational chatbot agent that can engage in natural dialogue",
        bot_id=final_bot_id,
        user_id=final_user_id,
        parameters=final_parameters,
        fix_event_ids=True,  # Enable event ID fixing for proper tracking
    )

    return agent



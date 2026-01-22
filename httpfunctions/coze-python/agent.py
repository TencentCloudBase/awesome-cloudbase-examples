"""Agentic Chat Agent Implementation.

This module implements a conversational chat agent using Coze platform
integrated with AG-Kit. The agent uses Coze Chat V3 API for interactions
and supports streaming responses, reasoning content, and custom parameters.

This is the Example/Configuration layer that:
1. Reads all environment variables (from system env or .env file loaded by app entry point)
2. Passes explicit parameters to CozeAgent (Package layer handles validation and client creation)

Environment variables can be set via:
- System environment variables (takes priority, recommended for production)
- .env file (loaded by app entry point, used for local development)

Note: This module does NOT call load_dotenv() to avoid side effects when imported.
The application entry point (app.py) should call load_dotenv() before importing this module.
"""

import os
import json
from typing import Optional

from cloudbase_agent.coze import CozeAgent


def build_coze_agent(
    # Required parameters (must be provided via parameter or environment variable)
    bot_id: Optional[str] = None,
    user_id: Optional[str] = None,
    coze_api_token: Optional[str] = None,
    # Optional parameters
    parameters: Optional[dict] = None,
    coze_api_base: Optional[str] = None,
    debug_mode: Optional[bool] = None,
) -> CozeAgent:
    """Build and return a Coze agent instance.

    This factory function is responsible for:
    1. Reading all environment variables (Example layer responsibility)
    2. Passing explicit parameters to CozeAgent (Package layer handles validation)

    The CozeAgent (Package layer) handles all parameter validation and client creation.
    This example layer only reads configuration from environment variables.

    Required Parameters (via argument or environment variable)
    ---------------------------------------------------------
    bot_id : Optional[str]
        Bot ID for Coze conversations. **REQUIRED** - must be provided either:
        - As function argument: ``bot_id="your-bot-id"``
        - Via environment variable: ``COZE_BOT_ID=your-bot-id``
        
        Raises ValueError if not provided.
        
    user_id : Optional[str]
        User ID for Coze conversations. **REQUIRED** - must be provided either:
        - As function argument: ``user_id="your-user-id"``
        - Via environment variable: ``COZE_USER_ID=your-user-id``
        
        Raises ValueError if not provided.
        
    coze_api_token : Optional[str]
        Coze API token. **REQUIRED** - must be provided either:
        - As function argument: ``coze_api_token="your-token"``
        - Via environment variable: ``COZE_API_TOKEN=your-token``
        
        Raises ValueError if not provided.

    Optional Parameters
    -------------------
    parameters : Optional[dict]
        Optional parameters for Coze chat API (e.g., temperature, max_tokens).
        Can also be set via COZE_PARAMETERS environment variable as JSON string.
        Example: ``{"temperature": 0.7, "max_tokens": 2000}``
        
    coze_api_base : Optional[str]
        Coze API base URL. If not provided:
        - Uses COZE_API_BASE environment variable if set
        - Defaults to China region: ``https://api.coze.cn``
        - For international: use ``https://api.coze.com``
        
    debug_mode : Optional[bool]
        Enable debug logging. If not provided:
        - Uses DEBUG environment variable if set (true/1/yes)
        - Defaults to False

    Returns
    -------
    CozeAgent
        Configured Coze agent instance ready for use.

    Raises
    ------
    ValueError
        If required parameters (bot_id, user_id, coze_api_token) are not provided
        and not found in environment variables. The error message will clearly
        indicate which parameter is missing.

    Example
    -------
    Using with .env file (recommended for local development)::

        # Create a .env file in the same directory:
        # COZE_API_TOKEN=your-token
        # COZE_BOT_ID=your-bot-id
        # COZE_USER_ID=your-user-id
        # COZE_API_BASE=https://api.coze.cn (optional)
        # COZE_PARAMETERS={"temperature": 0.7} (optional)

        from agent import build_coze_agent
        agent = build_coze_agent()

    Using with environment variables (recommended for deployment)::

        # Set environment variables in your deployment environment:
        # COZE_API_TOKEN=your-token
        # COZE_BOT_ID=your-bot-id
        # COZE_USER_ID=your-user-id
        # COZE_API_BASE=https://api.coze.cn (optional)
        # COZE_PARAMETERS={"temperature": 0.7} (optional)

        from agent import build_coze_agent
        agent = build_coze_agent()

    Using with explicit parameters (recommended for testing)::

        from agent import build_coze_agent

        agent = build_coze_agent(
            bot_id="7123456789012345678",
            user_id="test_user_123",
            coze_api_token="pat_abc123...",
            parameters={"temperature": 0.7, "max_tokens": 2000}
        )
    """
    # ============================================================
    # Step 1: Read all environment variables in Example layer
    # Note: Parameter validation is handled by CozeAgent (Package layer)
    # ============================================================

    # Read API token (required - validation happens in CozeAgent)
    final_api_token = coze_api_token or os.environ.get("COZE_API_TOKEN")

    # Read API base URL (optional, defaults to China region in CozeAgent)
    final_api_base = coze_api_base or os.environ.get("COZE_API_BASE")

    # Read bot_id (required - validation happens in CozeAgent)
    final_bot_id = bot_id or os.environ.get("COZE_BOT_ID")

    # Read user_id (required - validation happens in CozeAgent)
    final_user_id = user_id or os.environ.get("COZE_USER_ID")

    # Read optional parameters from environment if not provided
    final_parameters = parameters
    if final_parameters is None and os.environ.get("COZE_PARAMETERS"):
        try:
            final_parameters = json.loads(os.environ.get("COZE_PARAMETERS", "{}"))
        except json.JSONDecodeError as e:
            # Log warning but continue with empty parameters
            print(f"Warning: Failed to parse COZE_PARAMETERS: {e}")
            final_parameters = {}

    # Read debug_mode from environment if not provided
    final_debug_mode = debug_mode
    if final_debug_mode is None:
        final_debug_mode = os.environ.get("DEBUG", "").lower() in ("true", "1", "yes")

    # ============================================================
    # Step 2: Create CozeAgent with token-based initialization
    #         All validation happens in CozeAgent (Package layer)
    # ============================================================

    agent = CozeAgent(
        # Required parameters
        name="agentic_chat",
        description="A conversational chatbot agent that can engage in natural dialogue",
        api_token=final_api_token,
        bot_id=final_bot_id,
        user_id=final_user_id,
        # Optional parameters
        base_url=final_api_base,
        parameters=final_parameters,
        fix_event_ids=True,
        debug_mode=final_debug_mode,
    )

    return agent



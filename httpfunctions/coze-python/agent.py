"""Coze Agent Implementation.

This module provides agent configuration and JWT authentication for Coze platform.
"""

import os
from typing import Optional

from cloudbase_agent.coze import CozeAgent
from auth import decode_jwt


def build_coze_agent(
    bot_id: Optional[str] = None,
    coze_api_token: Optional[str] = None,
    coze_api_base: Optional[str] = None,
    debug_mode: Optional[bool] = None,
) -> CozeAgent:
    """Build and return a Coze agent instance.
    
    Parameters can be provided via arguments or environment variables:
    - COZE_API_TOKEN (required)
    - COZE_BOT_ID (required)
    - COZE_API_BASE (optional, defaults to https://api.coze.cn)
    - DEBUG (optional, true/1/yes to enable)
    
    Note: user_id should be provided per-request via forwarded_props.user_id
    """
    final_api_token = coze_api_token or os.environ.get("COZE_API_TOKEN")
    final_api_base = coze_api_base or os.environ.get("COZE_API_BASE")
    final_bot_id = bot_id or os.environ.get("COZE_BOT_ID")
    
    if debug_mode is None:
        debug_mode = os.environ.get("DEBUG", "").lower() in ("true", "1", "yes")

    agent = CozeAgent(
        name="agentic_chat",
        description="A conversational chatbot agent that can engage in natural dialogue",
        api_token=final_api_token,
        bot_id=final_bot_id,
        base_url=final_api_base,
        fix_event_ids=True,
        debug_mode=debug_mode,
    )

    return agent


STATE_REQUEST_CONTEXT_KEY = "__request_context__"


def jwt_middleware(input_data, request):
    """JWT authentication middleware.

    Decodes JWT from Authorization header and injects into input_data:
    - forwarded_props.user_id (sub) only; parameters come from client. Do not pass jwt in forwarded_props.
    - state.__request_context__.user = {"id": user_id, "jwt": payload} for workflow use

    Auth and state injection in the example only; adapter does not touch state.
    Uses generator pattern with yield for control flow transfer.
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        auth_header = getattr(request, "headers", None) and request.headers.get("Authorization") or ""
        if isinstance(auth_header, str) and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if token:
                user_id, payload = decode_jwt(token)
                if not input_data.forwarded_props:
                    input_data.forwarded_props = {}
                if user_id:
                    input_data.forwarded_props["user_id"] = user_id
                    logger.info("JWT middleware: User authenticated with ID: %s", user_id)
                if user_id:
                    if input_data.state is None:
                        input_data.state = {}
                    existing = dict(input_data.state.get(STATE_REQUEST_CONTEXT_KEY) or {})
                    existing["user"] = {"id": user_id.strip(), "jwt": payload}
                    input_data.state[STATE_REQUEST_CONTEXT_KEY] = existing
        else:
            logger.debug("JWT middleware: No valid Authorization Bearer token found")
    except Exception as e:
        logger.error("JWT middleware error: %s", e)

    yield
    logger.debug("JWT middleware: Post-processing completed")

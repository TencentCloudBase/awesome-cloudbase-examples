"""Dify Agent Implementation.

This module provides agent configuration and JWT authentication for Dify platform.
"""

import os
from typing import Optional

from cloudbase_agent.dify import DifyAgent
from auth import decode_jwt


def build_dify_agent(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    debug_mode: Optional[bool] = None,
) -> DifyAgent:
    """Build and return a Dify agent instance.
    
    Parameters can be provided via arguments or environment variables:
    - DIFY_API_KEY (required)
    - DIFY_API_BASE (optional, defaults to https://api.dify.ai/v1)
    - DEBUG (optional, true/1/yes to enable)
    
    Note: user identifier should be provided per-request via forwarded_props.user
    """
    final_api_key = api_key or os.environ.get("DIFY_API_KEY")
    final_base_url = base_url or os.environ.get("DIFY_API_BASE", "https://api.dify.ai/v1")
    
    if debug_mode is None:
        debug_mode = os.environ.get("DEBUG", "").lower() in ("true", "1", "yes")

    agent = DifyAgent(
        name="agentic_chat",
        description="A conversational chatbot agent that can engage in natural dialogue",
        api_key=final_api_key,
        base_url=final_base_url,
        fix_event_ids=True,
        debug_mode=debug_mode,
    )

    return agent


STATE_REQUEST_CONTEXT_KEY = "__request_context__"


def jwt_middleware(input_data, request):
    """JWT authentication middleware.

    Decodes JWT from Authorization header and injects into input_data:
    - forwarded_props.user (sub) only; Dify uses 'user' field. Do not pass jwt in forwarded_props.
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
                    input_data.forwarded_props["user"] = user_id
                    logger.info("JWT middleware: User authenticated with ID: %s", user_id)
                if user_id:
                    if input_data.state is None:
                        input_data.state = {}
                    existing = dict(input_data.state.get(STATE_REQUEST_CONTEXT_KEY) or {})
                    existing["user"] = {"id": user_id.strip(), "jwt": payload}
                    input_data.state[STATE_REQUEST_CONTEXT_KEY] = existing
                    logger.debug(
                        "JWT middleware: Injected state.%s.user (id=%s)",
                        STATE_REQUEST_CONTEXT_KEY,
                        user_id,
                    )
        else:
            logger.debug("JWT middleware: No valid Authorization Bearer token found")
    except Exception as e:
        logger.error("JWT middleware error: %s", e)

    yield
    logger.debug("JWT middleware: Post-processing completed")


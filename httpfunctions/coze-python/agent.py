"""Coze Agent Implementation.

This module provides agent configuration and JWT authentication for Coze platform.
"""

import os
from typing import Optional

from cloudbase_agent.coze import CozeAgent
from auth import extract_user_id_from_request


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


def jwt_middleware(input_data, request):
    """JWT authentication middleware.
    
    Extracts user_id from JWT 'sub' field in Authorization header
    and injects it into input_data.forwarded_props.user_id.
    
    Uses generator pattern with yield for control flow transfer.
    """
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        user_id = extract_user_id_from_request(request)
        if user_id:
            if not input_data.forwarded_props:
                input_data.forwarded_props = {}
            input_data.forwarded_props["user_id"] = user_id
            logger.info(f"JWT middleware: User authenticated with ID: {user_id}")
        else:
            logger.debug("JWT middleware: No valid user_id found in request")
    except Exception as e:
        logger.error(f"JWT middleware error: {e}")
        # Continue processing even if JWT extraction fails
        pass
    
    # Transfer control to next middleware or agent
    yield
    
    # Post-processing (optional)
    logger.debug("JWT middleware: Post-processing completed")




# -*- coding: utf-8 -*-
"""JWT Authentication Helper.

Extracts user_id from JWT 'sub' field and full decoded payload (all claims) from Authorization header.
"""

import base64
import json
import logging
from typing import Any, Dict, Optional, Tuple

from fastapi import Request

logger = logging.getLogger(__name__)


def decode_jwt(token: str) -> Tuple[Optional[str], Dict[str, Any]]:
    """Decode JWT token and return (user_id from 'sub', full payload as dict).

    Payload is the decoded body (all claims flattened) for state.__request_context__.user.jwt.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            logger.warning("Invalid JWT format: expected 3 parts, got %d", len(parts))
            return None, {}

        payload_part = parts[1]
        padding = 4 - len(payload_part) % 4
        if padding != 4:
            payload_part += "=" * padding

        payload_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(payload_bytes)
        if not isinstance(payload, dict):
            return None, {}

        sub = payload.get("sub")
        user_id = sub.strip() if isinstance(sub, str) and sub and sub.strip() else None
        return user_id, payload

    except Exception as e:
        logger.warning("Failed to decode JWT: %s", str(e))
        return None, {}


def extract_user_id_from_jwt(token: str) -> Optional[str]:
    """Extract user_id from JWT token 'sub' field."""
    user_id, _ = decode_jwt(token)
    return user_id


def extract_user_id_from_request(http_context: Request) -> Optional[str]:
    """Extract user_id from Authorization header."""
    auth_header = http_context.headers.get("Authorization", "")
    
    if not auth_header:
        logger.debug("No Authorization header found")
        return None
    
    if not auth_header.startswith("Bearer "):
        logger.debug("Authorization header does not start with 'Bearer '")
        return None
    
    # Extract token (remove "Bearer " prefix)
    token = auth_header[7:].strip()
    
    if not token:
        logger.debug("Empty token in Authorization header")
        return None
    
    return extract_user_id_from_jwt(token)

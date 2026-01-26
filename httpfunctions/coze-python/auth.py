# -*- coding: utf-8 -*-
"""JWT Authentication Helper.

Extracts user_id from JWT 'sub' field in Authorization header.
"""

import base64
import json
import logging
from typing import Optional

from fastapi import Request

logger = logging.getLogger(__name__)


def extract_user_id_from_jwt(token: str) -> Optional[str]:
    """Extract user_id from JWT token 'sub' field."""
    try:
        # JWT format: header.payload.signature
        parts = token.split(".")
        if len(parts) != 3:
            logger.warning("Invalid JWT format: expected 3 parts, got %d", len(parts))
            return None
        
        # Decode payload (second part)
        payload_part = parts[1]
        # Add padding if needed
        padding = 4 - len(payload_part) % 4
        if padding != 4:
            payload_part += "=" * padding
        
        # Decode base64url
        payload_bytes = base64.urlsafe_b64decode(payload_part)
        payload = json.loads(payload_bytes)
        
        # Extract user_id from `sub` field (standard JWT claim for subject/user identifier)
        # This is the primary and recommended field for user identity in JWT
        sub = payload.get("sub")
        
        if sub and isinstance(sub, str) and sub.strip():
            return sub.strip()
        
        # If sub is empty or missing, log warning
        # Coze SDK requires user_id, so this will cause an error downstream
        logger.warning(
            "JWT payload 'sub' field is empty or missing. "
            "Coze SDK requires user_id, so this will cause an error. "
            "Available claims: %s",
            list(payload.keys())
        )
        return None
        
    except Exception as e:
        logger.warning("Failed to extract user_id from JWT: %s", str(e))
        return None


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

# -*- coding: utf-8 -*-
"""Runtime Compatibility Fixes for SCF Environment.

This module handles compatibility issues between dependencies and the runtime environment.
All fixes are automatically applied when this module is imported.
"""

import os
from pydantic import BaseModel


def fix_pydantic_v2_compatibility() -> None:
    """Fix Pydantic v2 parameter compatibility issues.
    
    Removes the unsupported 'ensure_ascii' parameter from model_dump_json.
    """
    _original_model_dump_json = BaseModel.model_dump_json

    def _patched_model_dump_json(self, *args, **kwargs):
        kwargs.pop("ensure_ascii", None)
        return _original_model_dump_json(self, *args, **kwargs)

    BaseModel.model_dump_json = _patched_model_dump_json


def fix_litellm_offline_mode() -> None:
    """Prevent litellm from accessing HuggingFace in SCF environment.
    
    Forces litellm to work offline by:
    1. Disabling external network access for HuggingFace/Transformers
    """
    # Disable external network access
    os.environ["HF_HUB_OFFLINE"] = "1"
    # Disable litellm cost tracking
    os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
    os.environ["LITELLM_DROP_PARAMS"] = "True"


# Apply all fixes on module import
fix_pydantic_v2_compatibility()
fix_litellm_offline_mode()

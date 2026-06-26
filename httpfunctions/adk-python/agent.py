#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ADK Agent Implementation for CloudBase.

使用 LiteLLM 支持多种 OpenAI 兼容模型（通义千问、智谱 GLM、OpenAI 等）。

Setup:
    1. Copy .env.example to .env
    2. Configure OPENAI_* environment variables
    3. Deploy to CloudBase SCF or run locally
"""

import os
from dotenv import load_dotenv
from google.adk.agents.llm_agent import Agent
from google.adk.models.lite_llm import LiteLlm
from cloudbase_agent.adk import ADKAgent

# Load environment variables
load_dotenv()


def create_adk_agent() -> ADKAgent:
    """Create ADK agent with LiteLLM (supports multiple OpenAI-compatible models).
    
    Returns:
        ADKAgent: Configured agent instance
        
    Raises:
        ValueError: If required environment variables are missing
    """
    # Read environment variables
    model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")
    api_key = os.getenv("OPENAI_API_KEY", "")
    
    # CRITICAL: Ensure environment variables are set for LiteLLM
    # LiteLLM in ADK context reads from environment variables
    os.environ["OPENAI_API_KEY"] = api_key
    os.environ["OPENAI_BASE_URL"] = base_url
    
    
    model = LiteLlm(
        model=f"openai/{model_name}"
    )
    
    # Create ADK agent
    adk_agent = Agent(
        model=model,
        name='assistant',
        description='A helpful AI assistant.',
        instruction='Answer user questions to the best of your knowledge',
    )
    
    print("Wrapping with ADKAgent...")
    
    # Wrap with CloudBase Agent adapter
    agent = ADKAgent(
        adk_agent=adk_agent,
        user_id="demo_user",
        session_timeout_seconds=3600,
        emit_messages_snapshot=True,
        # Timeouts must be less than SCF timeout (300s)
        execution_timeout_seconds=60,
        tool_timeout_seconds=30,
    )
    
    return agent

# -*- coding: utf-8 -*-
"""CloudBase ADK Agent Service Entry Point.

This is the main entry point for the ADK agent service.
It creates the agent and runs it using CloudBase Agent Server.

For local development:
    python app.py

For SCF deployment:
    The scf_bootstrap script will execute this file
"""

from cloudbase_agent.server import AgentServiceApp
from agent import create_adk_agent


if __name__ == "__main__":
    agent = create_adk_agent()
    AgentServiceApp().run(lambda: {"agent": agent})

# -*- coding: utf-8 -*-
"""Coze Agent Application Entry Point."""

from cloudbase_agent.server import AgentServiceApp

from agent import build_coze_agent

if __name__ == "__main__":
    agent = build_coze_agent()
    AgentServiceApp().run(lambda: {"agent": agent})
# -*- coding: utf-8 -*-
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.langgraph import LangGraphAgent
from agent import build_agentic_chat_workflow

if __name__ == "__main__":
    agent = LangGraphAgent(graph=build_agentic_chat_workflow())
    AgentServiceApp().run(lambda: {"agent": agent})
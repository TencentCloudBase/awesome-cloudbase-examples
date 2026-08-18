# -*- coding: utf-8 -*-
import os
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.langgraph import LangGraphAgent
from cloudbase_agent.observability.server import ConsoleTraceConfig
from agent import build_agentic_chat_workflow


def is_observability_enabled():
    value = os.environ.get("AUTO_TRACES_STDOUT", "").lower()
    return value not in ("false", "0")


if __name__ == "__main__":
    agent = LangGraphAgent(graph=build_agentic_chat_workflow())
    
    observability = ConsoleTraceConfig() if is_observability_enabled() else None
    
    AgentServiceApp(observability=observability).run(lambda: {"agent": agent})
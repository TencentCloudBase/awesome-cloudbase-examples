# -*- coding: utf-8 -*-
from cloudbase_agent.server import AgentServiceApp

import compatibility

from agent import build_chat_workflow, CrewAIAgent

if __name__ == "__main__":
    agent = CrewAIAgent(
        flow=build_chat_workflow(),
    )
    AgentServiceApp().run(lambda:{"agent": agent})
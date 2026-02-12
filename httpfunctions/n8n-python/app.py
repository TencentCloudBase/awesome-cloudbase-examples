# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.observability.server import ConsoleTraceConfig
from agent import build_n8n_agent

load_dotenv()


def is_observability_enabled():
    value = os.environ.get("AUTO_TRACES_STDOUT", "").lower()
    return value not in ("false", "0")


if __name__ == "__main__":
    agent = build_n8n_agent()

    observability = ConsoleTraceConfig() if is_observability_enabled() else None

    AgentServiceApp(observability=observability).run(lambda: {"agent": agent})

# -*- coding: utf-8 -*-
"""Coze Agent Application Entry Point."""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.observability.server import ConsoleTraceConfig
from agent import build_coze_agent, jwt_middleware


def is_observability_enabled():
    value = os.environ.get("AUTO_TRACES_STDOUT", "").lower()
    return value not in ("false", "0")


def main():
    """Application entry point."""
    try:
        agent = build_coze_agent()
        
        observability = ConsoleTraceConfig() if is_observability_enabled() else None
        
        app = AgentServiceApp(observability=observability)
        app.use(jwt_middleware)
        app.run(lambda: {"agent": agent})
    except ValueError as e:
        print(f"Configuration Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        raise


if __name__ == "__main__":
    main()
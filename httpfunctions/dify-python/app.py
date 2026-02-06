# -*- coding: utf-8 -*-
"""Dify Agent Application Entry Point."""

import sys
from dotenv import load_dotenv

load_dotenv()

from cloudbase_agent.server import AgentServiceApp
from agent import build_dify_agent, jwt_middleware


def main():
    """Application entry point."""
    try:
        agent = build_dify_agent()
        app = AgentServiceApp()
        app.use(jwt_middleware)
        app.run(lambda: {"agent": agent})
    except ValueError as e:
        print(f"Configuration Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        raise


if __name__ == "__main__":
    main()

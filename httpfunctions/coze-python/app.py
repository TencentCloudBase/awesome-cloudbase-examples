# -*- coding: utf-8 -*-
"""Coze Agent Application Entry Point."""

import sys
from dotenv import load_dotenv

load_dotenv()

from cloudbase_agent.server import AgentServiceApp
from agent import build_coze_agent, create_jwt_request_preprocessor


def main():
    """Application entry point."""
    try:
        agent = build_coze_agent()
        AgentServiceApp().run(
            lambda: {"agent": agent},
            request_preprocessor=create_jwt_request_preprocessor(),
        )
    except ValueError as e:
        print(f"Configuration Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        raise


if __name__ == "__main__":
    main()
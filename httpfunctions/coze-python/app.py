# -*- coding: utf-8 -*-
"""Coze Agent Application Entry Point."""

import sys
from dotenv import load_dotenv

load_dotenv()

from cloudbase_agent.server import AgentServiceApp
from agent import build_coze_agent


def main():
    """Application entry point with proper error handling."""
    try:
        agent = build_coze_agent()
        AgentServiceApp().run(lambda: {"agent": agent})
    except ValueError as e:
        # Configuration errors - show clean message without traceback
        print(f"Configuration Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        # Unexpected errors - show traceback for debugging
        raise


if __name__ == "__main__":
    main()
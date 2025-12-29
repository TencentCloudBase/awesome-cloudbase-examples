# -*- coding: utf-8 -*-
from pydantic import BaseModel
from cloudbase_agent.server import AgentServiceApp

from agent import build_chat_workflow, PatchedCrewAIAgent

# Monkey patch to ignore unsupported ensure_ascii argument in model_dump_json
_original_model_dump_json = BaseModel.model_dump_json

def _patched_model_dump_json(self, *args, **kwargs):
    kwargs.pop("ensure_ascii", None)
    return _original_model_dump_json(self, *args, **kwargs)

BaseModel.model_dump_json = _patched_model_dump_json

def main() -> None:
    agent = PatchedCrewAIAgent(
        flow=build_chat_workflow(),
    )
    AgentServiceApp().run(lambda:{"agent": agent})

if __name__ == "__main__":
    main()
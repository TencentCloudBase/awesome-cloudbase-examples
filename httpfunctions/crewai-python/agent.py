"""Agentic Chat Agent Implementation.

This module implements a conversational chat agent using CrewAI Flow framework
integrated with Cloudbase Agent. The agent uses LiteLLM for model interactions and
supports streaming responses.
"""

import os
import sys
import pysqlite3
from pathlib import Path

# Configure HOME and CrewAI storage directories for SCF environment
os.environ["HOME"] = "/tmp"
os.environ["CREWAI_STORAGE_DIR"] = "/tmp"

# Create required directories
credentials_dir = Path("/tmp/.local/share/crewai/credentials")
credentials_dir.mkdir(parents=True, exist_ok=True)

# Replace sqlite3 with pysqlite3 for SCF compatibility
sys.modules['sqlite3'] = pysqlite3 
  
from crewai import Crew, Agent, Task

try:
    from crewai.flow import Flow, start, persist
except ModuleNotFoundError as exc:
    raise ImportError(
        "crewai.flow is required. Please install a CrewAI version that includes Flow (e.g., crewai>=1.7.2)."
    ) from exc
from litellm import acompletion
from crewai.events.event_bus import crewai_event_bus
from ag_ui.core import EventType
from cloudbase_agent.crewai import CrewAIAgent as _BaseCrewAIAgent
from cloudbase_agent.crewai.converters import CopilotKitState
from cloudbase_agent.crewai.context import flow_context
from cloudbase_agent.crewai.events import BridgedTextMessageChunkEvent

from dotenv import load_dotenv
load_dotenv()

class CrewAIAgent(_BaseCrewAIAgent):
    """Override run to avoid BaseAgent.as_current cross-context reset."""

    async def run(self, run_input):
        if getattr(self, "_should_fix_event_ids", True):
            async for event in self._run_internal(run_input):
                yield super()._fix_event_ids(event, run_input.thread_id, run_input.run_id)
        else:
            async for event in self._run_internal(run_input):
                yield event


@persist()
class AgenticChatFlow(Flow[CopilotKitState]):
    """Conversational chat flow using CrewAI framework.

    This flow implements a basic chat agent that processes user messages
    and generates streaming responses using LiteLLM completion API.

    :ivar state: Flow state containing conversation messages and CopilotKit context
    :type state: CopilotKitState
    """

    @start()
    async def chat(self) -> None:
        """Process chat messages and generate streaming responses.

        This method is the entry point of the flow. It sends messages to the LLM,
        streams the response back, and updates the conversation state.

        The method:
        1. Constructs messages with system prompt and conversation history
        2. Calls LiteLLM completion API with streaming enabled
        3. Wraps the response in copilotkit_stream for proper formatting
        4. Appends the assistant's response to conversation state

        :raises Exception: If LLM completion fails or streaming encounters errors
        """
        system_prompt = "You are a helpful assistant."

        try:
            model_name = os.getenv("OPENAI_MODEL", "qwen-plus")
            base_url = os.getenv("OPENAI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
            api_key = os.getenv("OPENAI_API_KEY")
            tools = getattr(self.state.copilotkit, "actions", [])
            tools_arg = tools if tools else None  # qwen 兼容接口不接受空数组

            # Run the model and stream the response
            stream = await acompletion(
                model=model_name,
                messages=[{"role": "system", "content": system_prompt}, *self.state.messages],
                tools=tools_arg,
                parallel_tool_calls=False,
                stream=False, 
                base_url=base_url,
                api_key=api_key,
                custom_llm_provider="openai",
            )

            message = stream.choices[0].message
            content = message.content if hasattr(message, "content") else None

            if content:
                flow = flow_context.get(None)
                if flow is not None:
                    crewai_event_bus.emit(
                        flow,
                        BridgedTextMessageChunkEvent(
                            type=EventType.TEXT_MESSAGE_CHUNK,
                            message_id=getattr(message, "id", None) or stream.id,
                            role="assistant",
                            delta=content,
                        ),
                    )

            self.state.messages.append(message)
        except Exception as e:
            print(f"[CrewAI Flow Chat] {e}")


def build_chat_workflow() -> AgenticChatFlow:
    """Build and return a new chat workflow instance.

    This factory function creates a fresh instance of AgenticChatFlow
    for each conversation to ensure proper isolation.

    :return: New instance of the chat workflow
    :rtype: AgenticChatFlow
    """
    return AgenticChatFlow()

"""Agentic Chat Agent Implementation.

This module implements a conversational chat agent using CrewAI Flow framework
integrated with Cloudbase Agent. The agent uses LiteLLM for model interactions and
supports streaming responses.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Configure environment for SCF compatibility
os.environ["HOME"] = "/tmp"

import pysqlite3
sys.modules['sqlite3'] = pysqlite3

# Force override environment variables with .env file values
load_dotenv(override=True)

from crewai.flow import Flow, start, persist
from litellm import acompletion
from cloudbase_agent.crewai import CrewAIAgent as _BaseCrewAIAgent
from cloudbase_agent.crewai.converters import CopilotKitState, copilotkit_stream


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
    """

    @start()
    async def chat(self) -> None:
        """Process chat messages and generate streaming responses.

        This method:
        1. Constructs messages with system prompt and conversation history
        2. Calls LiteLLM completion API with streaming enabled
        3. Uses copilotkit_stream to automatically emit all required events
        4. Appends the assistant's response to conversation state
        """
        system_prompt = "You are a helpful assistant."

        try:
            model_name = os.getenv("OPENAI_MODEL")
            base_url = os.getenv("OPENAI_BASE_URL")
            api_key = os.getenv("OPENAI_API_KEY")
            
            tools = getattr(self.state.copilotkit, "actions", [])
            tools_arg = tools if tools else None

            # Run the model and stream the response
            stream = await acompletion(
                model=model_name,
                messages=[{"role": "system", "content": system_prompt}, *self.state.messages],
                tools=tools_arg,
                parallel_tool_calls=False,
                stream=True,
                base_url=base_url,
                api_key=api_key,
                custom_llm_provider="openai",
            )

            # Use copilotkit_stream to handle all events automatically
            response = await copilotkit_stream(stream)

            # Extract message from response
            message = response.choices[0].message

            message_dict = {
                "role": message.role,
                "content": message.content,
            }
            # Add optional fields if present
            if hasattr(message, "tool_calls") and message.tool_calls:
                message_dict["tool_calls"] = message.tool_calls
            if hasattr(message, "name") and message.name:
                message_dict["name"] = message.name

            self.state.messages.append(message_dict)
        except Exception as e:
            print(f"[CrewAI Flow Chat] {e}")
            import traceback
            traceback.print_exc()


def build_chat_workflow() -> AgenticChatFlow:
    """Build and return a new chat workflow instance.

    This factory function creates a fresh instance of AgenticChatFlow
    for each conversation to ensure proper isolation.
    """
    return AgenticChatFlow()

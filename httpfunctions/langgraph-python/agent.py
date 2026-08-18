#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agentic Chat Agent Implementation.

This module provides a complete implementation of a conversational AI agent
using LangGraph workflows and OpenAI-compatible language models. It demonstrates
how to build streaming chat agents with proper state management, message
handling, and error recovery for production use.

Key Features:
    - Real-time streaming response generation
    - Conversation history management with proper role mapping
    - Integration with OpenAI-compatible API endpoints
    - Memory persistence using LangGraph checkpointers
    - Tool binding and function calling support
    - Robust error handling and graceful degradation
    - Environment-based configuration management

Architecture:
    The agent uses a simple linear workflow (START -> ai_response -> END)
    with state management for conversation continuity. It supports various
    message types (Human, System, AI) and provides streaming output for
    better user experience.

Usage:
    This agent can be deployed as a web service using the AG-Kit server
    framework or used programmatically for building conversational applications.
"""

import json
import os
from typing import Any, List, Optional
from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import AIMessage, SystemMessage, convert_to_openai_messages
from langchain_core.messages.ai import add_ai_message_chunks
from langchain_core.runnables import RunnableConfig
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.graph.state import CompiledStateGraph


class State(MessagesState):
    tools: List[Any]


def chat_node(state: State, config: Optional[RunnableConfig] = None) -> dict:
    try:
        # Validate required environment variables
        model_name = os.getenv("OPENAI_MODEL")
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL")
        
        if not model_name:
            raise ValueError("OPENAI_MODEL environment variable is not set")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        if not base_url:
            raise ValueError("OPENAI_BASE_URL environment variable is not set")
        
        # Create LangChain ChatOpenAI model from environment variables
        chat_model = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
        )

        # Set default config if none provided
        if config is None:
            config = RunnableConfig(recursion_limit=25)

        # Process and bind tools if available
        tools = state.get("tools", [])
        if tools:
            # Convert tools to OpenAI format, supporting both string and dict parameters
            tool_list = []
            for tool in tools:
                params = tool["parameters"]
                # Support both JSON string and dict format for flexibility
                if isinstance(params, str):
                    params = json.loads(params)
                tool_list.append({**tool, "parameters": params})
            
            tools_list = [convert_to_openai_function(item) for item in tool_list]
            chat_model_with_tools = chat_model.bind_tools(tools_list)
        else:
            chat_model_with_tools = chat_model

        # Create system message to set assistant behavior
        system_message = SystemMessage(content="You are a helpful assistant.")
        messages = [system_message, *convert_to_openai_messages(state["messages"])]

        # Stream through LangChain's standard streaming mechanism
        # The streaming will be automatically captured by LangGraph and AG-Kit
        chunks = []
        for chunk in chat_model_with_tools.stream(messages, config):
            chunks.append(chunk)  # Collect for final message

        # Merge all chunks into complete AIMessage
        if chunks:
            from langchain_core.messages import AIMessageChunk

            # Convert chunks to AIMessageChunk if needed
            ai_chunks = [
                chunk if isinstance(chunk, AIMessageChunk) else AIMessageChunk(content=str(chunk)) for chunk in chunks
            ]
            merged_message = add_ai_message_chunks(*ai_chunks)
            return {"messages": [merged_message]}
        else:
            return {"messages": []}
    except Exception as e:
        # Handle errors gracefully with informative messages
        return {"messages": [AIMessage(content=f"Error: {str(e)}")]}


def build_agentic_chat_workflow() -> CompiledStateGraph:
    # Create state graph for the chat workflow
    graph = StateGraph(State)
    memory = MemorySaver()  # In-memory checkpointer for conversation persistence

    # Add the AI response generation node
    graph.add_node("ai_response", chat_node)
    graph.set_entry_point("ai_response")

    # Define simple linear workflow: START -> ai_response -> END
    graph.add_edge(START, "ai_response")
    graph.add_edge("ai_response", END)

    # Compile workflow with memory checkpointer for conversation history
    return graph.compile(checkpointer=memory)

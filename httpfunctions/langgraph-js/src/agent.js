import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import {
  Command,
  Annotation,
  StateGraph,
  END,
  START,
  MemorySaver,
} from "@langchain/langgraph";
import {
  ClientStateAnnotation,
  LanggraphAgent,
} from "@cloudbase/agent-adapter-langgraph";

export const AgentStateAnnotation = Annotation.Root({
  ...ClientStateAnnotation.spec,
});

async function chatNode(state, config) {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });
  if (!config) {
    config = { recursionLimit: 25 };
  }

  const modelWithTools = model.bindTools([...(state.client?.tools || [])], {
    parallel_tool_calls: false,
  });

  const systemMessage = new SystemMessage({
    content: "你是一位精通云开发 CloudBase 的专家，擅长回答任何相关的问题。",
  });

  const response = await modelWithTools.invoke(
    [systemMessage, ...state.messages],
    config,
  );

  return new Command({
    goto: END,
    update: {
      messages: [response],
    },
  });
}
const workflow = new StateGraph(ClientStateAnnotation)
  .addNode("chat_node", chatNode)
  .addEdge(START, "chat_node")
  .addEdge("chat_node", END);

const agenticChatGraph = workflow.compile({
  checkpointer: new MemorySaver(),
});

export function createAgent() {
  return {
    agent: new LanggraphAgent({ compiledWorkflow: agenticChatGraph }),
  };
}

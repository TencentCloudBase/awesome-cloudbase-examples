---
name: cloudbase-agent-ts
description: "Build and deploy AI agents with Cloudbase Agent (TypeScript), a TypeScript SDK implementing the AG-UI protocol. Use when: (1) deploying agent servers with @cloudbase/agent-server, (2) using LangGraph adapter with ClientStateAnnotation, (3) using LangChain adapter with clientTools(), (4) building custom adapters that implement AbstractAgent, (5) understanding AG-UI protocol events, (6) building web UI clients with @ag-ui/client, (7) building WeChat Mini Program UIs with @cloudbase/agent-ui-miniprogram."
alwaysApply: false
---

# Cloudbase Agent (TypeScript)

TypeScript SDK for deploying AI agents as HTTP services using the AG-UI protocol.

> **Note:** This skill is for **TypeScript/JavaScript** projects only.

## When to use this skill

Use this skill for **AI agent development** when you need to:

- Deploy AI agents as HTTP services with AG-UI protocol support
- Build agent backends using LangGraph or LangChain frameworks
- Create custom agent adapters implementing the AbstractAgent interface
- Understand AG-UI protocol events and message streaming
- Build web UI clients that connect to AG-UI compatible agents
- Build WeChat Mini Program UIs for AI agent interactions

**Do NOT use for:**
- Simple AI model calling without agent capabilities (use `ai-model-*` skills)
- CloudBase cloud functions (use `cloud-functions` skill)
- CloudRun backend services without agent features (use `cloudrun-development` skill)

## How to use this skill (for a coding agent)

### MUST READ: Read ALL docs that match your task

**Before writing any code**, identify which docs you need and read ALL of them. Reading only a subset leads to incomplete implementations (missing CORS, wrong adapter patterns, no UI client code).

#### Scenario-based reading lists

| If the task asks you to... | You MUST read these docs |
|---|---|
| **Build a full-stack agent** (backend + frontend) | `server-quickstart.md` + adapter doc + `ui-clients.md` |
| **Deploy an agent server only** | `server-quickstart.md` |
| **Use LangGraph for agent logic** | `adapter-langgraph.md` + `server-quickstart.md` |
| **Use LangChain for agent logic** | `adapter-langchain.md` + `server-quickstart.md` |
| **Build a custom adapter** (no LangGraph/LangChain) | `adapter-development.md` + `agui-protocol.md` + `server-quickstart.md` |
| **Build a web/mini-program UI client** | `ui-clients.md` + `agui-protocol.md` |

### Step-by-step workflow

1. **Identify the adapter type** from the task description (LangGraph / LangChain / custom)
2. **Read the matching docs** from the table above — read ALL listed docs, not just one
3. **Set up the agent server** using `@cloudbase/agent-server` — always include `cors: true`
4. **Implement the agent logic** using the chosen adapter
5. **If building UI**, read `ui-clients.md` and create the client code

## Reference doc index

| Doc | When to read |
|------|------|
| [server-quickstart](server-quickstart.md) | Always — deployment, CORS, logging, endpoints |
| [adapter-langgraph](adapter-langgraph.md) | Task mentions LangGraph, StateGraph, or graph-based workflows |
| [adapter-langchain](adapter-langchain.md) | Task mentions LangChain, chains, or chain-based patterns |
| [adapter-development](adapter-development.md) | Task requires custom adapter (no existing framework adapter) |
| [agui-protocol](agui-protocol.md) | Task requires custom adapter or deep protocol understanding |
| [ui-clients](ui-clients.md) | Task mentions web UI, frontend, client, or SSE streaming |
| [ui-miniprogram](ui-miniprogram.md) | Task mentions WeChat Mini Program or miniprogram UI |

## Quick Start

```typescript
import { run } from "@cloudbase/agent-server";
import { LanggraphAgent } from "@cloudbase/agent-adapter-langgraph";

run({
  createAgent: () => ({ agent: new LanggraphAgent({ workflow }) }),
  port: 9000,
});
```

# -*- coding: utf-8 -*-
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.langgraph import LangGraphAgent
from agent import build_agentic_chat_workflow


def forwarded_props_middleware(input_data, request):
    """
    ForwardedProps 中间件
    从客户端请求中提取 forwardedProps 参数并注入到 input_data.state 中，
    使 LangGraph 的 chat_node 可以访问这些参数
    """
    try:
        forwarded_props = getattr(input_data, 'forwarded_props', {}) or {}
        
        if forwarded_props:
            if not hasattr(input_data, 'state') or input_data.state is None:
                input_data.state = {}
            
            # 将 forwardedProps 注入到 state 中，供 LangGraph 节点使用
            input_data.state['forwarded_props'] = forwarded_props
            
            print(f"ForwardedProps middleware: Injected {len(forwarded_props)} parameters into state")
            print(f"ForwardedProps content: {forwarded_props}")
        else:
            print(f"ForwardedProps middleware: No forwarded props found")
            
    except Exception as e:
        print(f"ForwardedProps middleware error: {e}")
        pass
    
    yield
    
    print(f"ForwardedProps middleware: Post-processing completed")


if __name__ == "__main__":
    agent = LangGraphAgent(graph=build_agentic_chat_workflow())
    
    # 创建应用并注册中间件
    app = AgentServiceApp()
    app.use(forwarded_props_middleware)
    app.run(lambda: {"agent": agent})
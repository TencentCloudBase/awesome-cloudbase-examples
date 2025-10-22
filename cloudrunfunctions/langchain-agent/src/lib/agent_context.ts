
import { AgentWrapper } from '../agent'
import { AgentInfo } from './agent_info';
import { TcbContext } from './tcb';
import { AgentConfig } from './agent_config';

export class AgentContext<StateT> {
  context: TcbContext
  config!: AgentConfig;
  agent!: AgentWrapper;
  info!: AgentInfo;
  state: StateT;

  constructor(context: TcbContext, state: StateT) {
    this.context = context;
    this.state = state;
  }
}

import { AgentWrapper } from '../agent'
import { AgentInfo } from './agent_info';
import { TcbContext } from './tcb';
import { AgentConfig } from './agent_config';

/**
 * Agent上下文类
 * 管理Agent运行时的上下文信息，包括配置、状态等
 * @template StateT - 状态类型
 */
export class AgentContext<StateT> {
  /** 云函数上下文 */
  context: TcbContext
  /** Agent配置 */
  config!: AgentConfig;
  /** Agent包装器实例 */
  agent!: AgentWrapper;
  /** Agent信息 */
  info!: AgentInfo;
  /** 状态对象 */
  state: StateT;

  /**
   * 构造函数
   * @param context - 云函数上下文
   * @param state - 初始状态
   */
  constructor(context: TcbContext, state: StateT) {
    this.context = context;
    this.state = state;
  }
}
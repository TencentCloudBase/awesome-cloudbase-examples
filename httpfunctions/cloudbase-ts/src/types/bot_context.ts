import { IBotConfig } from '../config/bot_config.js'
import { BotInfo } from '../config/bot_info.js'
import { CloudbaseContext } from './context.js'

/**
 * Bot 上下文基类
 */
export class BotContextBase<StateT> {
  context: CloudbaseContext
  config!: IBotConfig
  info!: BotInfo
  state!: StateT

  constructor(context: CloudbaseContext, state?: StateT) {
    this.context = context
    if (state !== undefined) {
      this.state = state
    }
  }
}

/**
 * Bot 上下文
 */
export class BotContext extends BotContextBase<void> {
  constructor(context: CloudbaseContext) {
    super(context)
  }
}

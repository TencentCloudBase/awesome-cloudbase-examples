import { MyBot } from './bot'
import { IBotConfig } from './bot_config'
import { BotInfo } from './bot_info'
import { TcbContext } from './tcb'

export class BotContextBase<StateT> {
  context: TcbContext

  config: IBotConfig
  bot: MyBot
  info: BotInfo
  state: StateT

  constructor (context: TcbContext, state: StateT) {
    this.context = context
    this.state = state
  }
}

export class BotContext extends BotContextBase<void> {
  constructor (context: TcbContext) {
    super(context)
  }
}

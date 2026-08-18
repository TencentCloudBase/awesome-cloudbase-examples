import 'dotenv/config'

import { BotRunner } from '@cloudbase/aiagent-framework'
import { TcbEventFunction } from '@cloudbase/functions-typings'

import { MyBot } from './bot'
import { botConfig } from './bot_config'
import config from './config'
import { checkIsInCBR, setDefaultAccessToken, setDefaultEnvId } from './tcb'

if (!checkIsInCBR()) {
  setDefaultEnvId(config.envId)
  setDefaultAccessToken(config.accessToken)
}

export const main: TcbEventFunction<unknown> = function (event, context) {
  return BotRunner.run(event, context, new MyBot(context, botConfig))
}

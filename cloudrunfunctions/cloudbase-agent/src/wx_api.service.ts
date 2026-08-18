import { BotContext } from './bot_context'

export class WxApiService {
  botContext: BotContext
  // localCache: LocalCacheService

  constructor (botContext?: BotContext) {
    this.botContext = botContext
    // this.localCache = new LocalCacheService
  }

  async sendMessageToClient (triggerSrc, toWxMsgData) {
    console.log('sendMessageToClient:', toWxMsgData)
    const sendResult = await this.botContext.bot.tools.sendWxClientMessage(
      this.botContext.bot.botId,
      triggerSrc,
      {
        msgType: toWxMsgData?.msgType,
        touser: toWxMsgData?.touser,
        text: toWxMsgData?.text,
        openKfId: toWxMsgData?.openKfId,
        msgId: toWxMsgData?.msgId
      }
    )
    console.log('sendResult:', sendResult)
  }
}

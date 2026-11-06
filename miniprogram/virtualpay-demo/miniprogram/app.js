const config = require('./config')

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      // env 请填云开发环境 ID，留空则使用默认环境
      env: config.envId || undefined,
      traceUser: true
    })
  },

  globalData: {
    openid: ''
  }
})

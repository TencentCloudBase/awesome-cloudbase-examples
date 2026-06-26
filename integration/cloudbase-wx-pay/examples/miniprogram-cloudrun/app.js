// ========== 部署相关配置（每次部署可能变化，统一在此处修改）==========
//
// ⚠️ 部署前请按实际情况替换以下两个变量：
//
//   1. ENV_ID          —— 你的云开发环境 ID（控制台 → 环境概览 可查）
//   2. SERVICE_NAME    —— 云托管服务名称（部署 pay-common 到云托管后，在控制台查看）
//   3. project.config.json 中的 appid —— 你的小程序 AppID
//
const ENV_ID = 'YOUR_ENV_ID'
const SERVICE_NAME = 'pay-common'

App({
  globalData: {
    envId: ENV_ID,
    serviceName: SERVICE_NAME,
  },

  onLaunch() {
    console.log('========== 云托管版微信支付 Demo（callContainer）==========')
    console.log('环境 ID:', ENV_ID)
    console.log('云托管服务:', SERVICE_NAME)

    // 启动时检查环境配置
    if (ENV_ID === 'YOUR_ENV_ID') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中将 ENV_ID 替换为你的云开发环境 ID',
        showCancel: false,
      })
      return
    }

    // 初始化微信云开发
    // wx.cloud.callContainer 需要先 init
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })

    console.log('[App] 云开发初始化完成, env:', ENV_ID)
  },
})

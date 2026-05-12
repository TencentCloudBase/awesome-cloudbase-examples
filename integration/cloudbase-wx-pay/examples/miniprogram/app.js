// ========== 部署相关配置（每次部署可能变化，统一在此处修改）==========
//
// ⚠️ 部署前请按实际情况替换以下三个变量：
//
//   1. ENV_ID         —— 你的云开发环境 ID（控制台 → 环境概览 可查）
//   2. FUNCTION_NAME  —— 部署的 HTTP 云函数名称（默认 pay-common，
//                       如果你部署时改了名字，这里要同步改）
//   3. project.config.json 中的 appid —— 你的小程序 AppID
//
const ENV_ID = 'YOUR_ENV_ID'
const FUNCTION_NAME = 'pay-common'

App({
  globalData: {
    envId: ENV_ID,
    functionName: FUNCTION_NAME,
  },

  onLaunch() {
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
    // wx.cloud.callHTTPFunction 需要先 init
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })

    console.log('[App] 云开发初始化完成, env:', ENV_ID)
  },
})

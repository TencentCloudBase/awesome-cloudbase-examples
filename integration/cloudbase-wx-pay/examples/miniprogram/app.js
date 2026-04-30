// ========== 云开发环境配置 ==========
// TODO: ⚠️ 部署前请替换为你自己的云开发环境 ID
const ENV_ID = 'YOUR_ENV_ID'
const API_GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`

// 引入 CloudBase JS SDK（npm install @cloudbase/js-sdk）
const cloudbase = require('@cloudbase/js-sdk')

App({
  globalData: {
    envId: ENV_ID,
    apiGateway: API_GATEWAY,
    accessToken: '',
    openid: '',
    loginReady: false,
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
    this.login()
  },

  /**
   * 静默登录流程（用户无感知）：
   * 1. @cloudbase/js-sdk signInWithOpenId() 一步完成登录
   * 2. 自动获取 openid + accessToken
   *
   * 前置条件：
   * - 控制台开启微信小程序身份源
   * - npm install @cloudbase/js-sdk + 微信开发者工具构建 npm
   */
  async login() {
    try {
      wx.showLoading({ title: '登录中...', mask: true })

      // 初始化 CloudBase JS SDK 并执行静默登录
      const cbApp = cloudbase.init({ env: ENV_ID })

      // 静默登录：自动获取 openid，用户无感知
      const { data, error } = await cbApp.auth.signInWithOpenId()

      if (error) {
        console.error('[登录失败]', error.code, error.message)
        wx.showToast({
          title: `登录失败: ${error.message}`,
          icon: 'error',
          duration: 3000,
        })
        this._notifyLoginReady()
        return
      }

      // 拿到 accessToken 和用户信息
      const accessToken = data.session?.access_token
      const user = data.user

      if (accessToken) {
        this.globalData.accessToken = accessToken
        console.log('[Token] 获取成功, expires_in:', data.session?.expires_in)
      } else {
        console.warn('[Token] 未获取到 access_token')
      }

      if (user) {
        // openid 在 identities[0].identity_data.provider_user_id
        const openid = user.identities?.[0]?.identity_data?.provider_user_id || ''
        this.globalData.openid = openid
        this.globalData.cloudbaseUid = user.id
        console.log('[OpenID]:', openid)
      }

      console.log('[登录] 静默登录完成')
      wx.showToast({ title: '登录成功', icon: 'success', duration: 1500 })

      this._notifyLoginReady()
    } catch (err) {
      console.error('[登录异常]', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'error',
        duration: 2000,
      })
      this._notifyLoginReady()
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 通知所有等待登录的调用方（支持多页面并发调用）
   */
  _notifyLoginReady() {
    this.globalData.loginReady = true
    if (this._loginCallbacks) {
      this._loginCallbacks.forEach(cb => cb())
      this._loginCallbacks = null
    }
  },

  /**
   * 等待登录完成（支持多页面并发调用）
   * 在页面 onLoad 中调用，确保后续操作有 accessToken
   */
  waitForLogin() {
    if (this.globalData.loginReady) return Promise.resolve()
    if (!this._loginPromise) {
      this._loginPromise = new Promise((resolve) => {
        if (!this._loginCallbacks) this._loginCallbacks = []
        this._loginCallbacks.push(resolve)
      })
    }
    return this._loginPromise
  },

  /**
   * 手动重新登录（accessToken 过期时使用）
   */
  async reLogin() {
    this.globalData.loginReady = false
    this._loginPromise = null
    await this.login()
  },
})

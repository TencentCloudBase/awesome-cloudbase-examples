// ========== 云托管配置 ==========

// 1. 云开发环境 ID
// TODO: ⚠️ 部署前请替换为你自己的云开发环境 ID
const ENV_ID = 'YOUR_ENV_ID'

// 2. Publishable Key（控制台 → 身份认证 → API Key 管理 获取）
// TODO: ⚠️ 如果使用 signInWithOpenId 报错需要 accessKey，请填入
// 如果小程序已开启微信云开发模式，可留空
const PUBLISHABLE_KEY = ''

// 3. 云托管服务域名
// 部署 pay-common 到云托管后，从控制台获取访问域名
// TODO: ⚠️ 部署前请替换为你的云托管服务域名
// 示例：https://pay-common-xxx-1234567890.ap-shanghai.app.tcloudbase.com
const CLOUDRUN_BASE_URL = 'https://YOUR_ENV_ID-YOUR_UIN.ap-shanghai.app.tcloudbase.com'

// ========== SDK 引入 ==========
const cloudbase = require('@cloudbase/js-sdk')

App({
  globalData: {
    envId: ENV_ID,
    cloudRunBaseUrl: CLOUDRUN_BASE_URL,
    accessToken: '',      // CloudBase Auth JWT token
    openid: '',           // 微信用户 openid
    cloudbaseUid: '',     // CloudBase 用户 ID
    loginReady: false,    // 登录状态
  },

  onLaunch() {
    console.log('========== 云托管版微信支付 Demo ==========')
    console.log('环境 ID:', ENV_ID)
    console.log('云托管域名:', CLOUDRUN_BASE_URL)

    // 启动时检查环境配置
    if (ENV_ID === 'YOUR_ENV_ID') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中替换以下配置：\n1. ENV_ID → 你的云开发环境 ID\n2. CLOUDRUN_BASE_URL → 你的云托管域名',
        showCancel: false,
      })
      return
    }

    this.login()
  },

  /**
   * 静默登录流程（CloudBase Auth + 微信小程序）
   * 
   * 流程：
   * 1. CloudBase SDK signInWithOpenId() 一步完成登录
   * 2. 自动获取 openid + accessToken（JWT）
   * 3. accessToken 用于调用云托管接口时的 Authorization header
   * 4. 云托管服务端自动从 JWT 解码 openid，无需前端传入
   * 
   * 前置条件：
   * - 控制台开启微信小程序身份源
   * - npm install @cloudbase/js-sdk + 微信开发者工具构建 npm
   */
  async login() {
    try {
      wx.showLoading({ title: '登录中...', mask: true })

      // 初始化 CloudBase JS SDK
      const initOptions = { env: ENV_ID }
      if (PUBLISHABLE_KEY) {
        initOptions.accessKey = PUBLISHABLE_KEY
      }
      const cbApp = cloudbase.init(initOptions)

      console.log('[登录] 开始 signInWithOpenId...')

      // 静默登录：自动调用 wx.login() + 后端验证
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

      // 解析返回的数据
      const session = data.session
      const user = data.user

      console.log('[登录成功] session:', session)
      console.log('[登录成功] user:', user)

      // 保存 accessToken
      if (session?.access_token) {
        this.globalData.accessToken = session.access_token
        console.log('[Token] 获取成功，expires_in:', session.expires_in, 's')
      } else {
        console.warn('[Token] 未获取到 access_token')
      }

      // 保存用户信息
      if (user) {
        this.globalData.cloudbaseUid = user.id

        // openid 位置：identities[0].identity_data.provider_user_id
        const identity = user.identities?.[0]
        const openid = identity?.identity_data?.provider_user_id

        if (openid) {
          this.globalData.openid = openid
          console.log('[OpenID] 获取成功:', openid)
        } else {
          console.warn('[OpenID] 未找到 openid，identity 结构:', identity)
        }
      }

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

// ========== 配置 ==========
const app = getApp()

/**
 * 生成商户订单号（前缀 + 时间戳 + 随机串）
 * 小程序环境无 Web Crypto API，使用 毫秒时间戳 + 多段随机拼接 降低碰撞概率
 */
function generateOutTradeNo() {
  const d = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
  const ms = Date.now().toString(36)  // 毫秒级时间戳（额外熵）
  const r1 = Math.random().toString(36).slice(2, 8)
  const r2 = Math.random().toString(36).slice(2, 6)
  return 'MP' + d + ms.slice(-4) + r1 + r2
}

/**
 * 将订单状态码转换为中文描述
 */
function getTradeStateDesc(tradeState) {
  const stateMap = {
    'SUCCESS': '支付成功',
    'REFUND': '转入退款',
    'NOTPAY': '未支付',
    'CLOSED': '已关闭',
    'REVOKED': '已撤销',
    'USERPAYING': '用户支付中',
    'PAYERROR': '支付失败',
  }
  return stateMap[tradeState] || '未知状态'
}

/**
 * 将退款状态码转换为中文描述
 */
function getRefundStateDesc(refundStatus) {
  const stateMap = {
    'SUCCESS': '退款成功',
    'PROCESSING': '退款处理中',
    'ABNORMAL': '退款异常',
    'CLOSED': '退款关闭',
  }
  return stateMap[refundStatus] || '未知状态'
}

/**
 * 通过云托管域名直连调用（AccessToken 鉴权）
 * 
 * 与云函数版的区别：
 * - 云函数版：经云 API 网关 → /v1/functions/pay-common?webfn=true，通过 body._action 分发路由
 * - 云托管版：直连云托管域名 → /cloudrun/v1/pay/<action> 路径，Express 标准路由分发
 * 
 * 云托管的优势：
 * - 标准 RESTful 路径（/cloudrun/v1/pay/wxpay_order 等）
 * - 无需 _action 中间层分发，Express 原生路由处理
 * - 支持更灵活的部署配置（自定义域名、多实例、弹性伸缩）
 * 
 * 支持 401 自动重试：token 过期时自动 reLogin 后重试一次
 *
 * @param {string} action - 路由路径名，如 'wxpay_order'
 * @param {object} data - 请求参数
 * @param {boolean} _isRetry - 内部参数，是否为重试请求
 */
function callCloudRun(action, data, _isRetry = false) {
  const { cloudRunBaseUrl, accessToken } = app.globalData

  if (!accessToken) {
    return Promise.reject({ code: -1, msg: 'accessToken 未获取，请等待登录完成' })
  }

  if (!cloudRunBaseUrl || cloudRunBaseUrl.includes('YOUR_')) {
    return Promise.reject({ code: -1, msg: '请先在 app.js 中配置 CLOUDRUN_BASE_URL（云托管域名）' })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      // 云托管直连：走完整的路由路径
      url: `${cloudRunBaseUrl}/cloudrun/v1/pay/${action}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      // 直接传业务参数，无需 _action 中间层
      data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else if ((res.statusCode === 401 || res.statusCode === 403) && !_isRetry) {
          // Token 过期，自动 reLogin 并重试一次
          console.warn('[鉴权] Token 可能过期，尝试重新登录...')
          app.reLogin().then(() => {
            callCloudRun(action, data, true).then(resolve).catch(reject)
          }).catch(() => {
            reject({ code: -1, msg: `鉴权失败 HTTP ${res.statusCode}`, data: res.data })
          })
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject({ code: -1, msg: `鉴权失败 HTTP ${res.statusCode}`, data: res.data })
        } else {
          reject({ code: -1, msg: `HTTP ${res.statusCode}`, data: res.data })
        }
      },
      fail: reject,
    })
  })
}

Page({
  data: {
    description: '测试商品',
    totalFee: 1,
    outTradeNo: '',
    transactionId: '',
    tradeState: '',

    // 退款信息
    outRefundNo: '',
    refundFee: 0,
    refundReason: '用户申请退款',

    // 商家转账信息
    transferAmount: 30,
    transferRemark: '测试转账',
    transferSceneId: '1000',
    outBillNo: '',
    transferBillNo: '',
    transferLoading: false,

    activeTab: 0,          // 0: 下单支付, 1: 商家转账
    payResult: '',         // 下单支付的返回结果
    transferResult: '',    // 商家转账的返回结果
    loading: false,
    openid: '',
    cloudbaseUid: '',
  },

  async onLoad() {
    await app.waitForLogin()
    this.setData({
      openid: app.globalData.openid,
      cloudbaseUid: app.globalData.cloudbaseUid,
    })
  },

  onDescInput(e) { this.setData({ description: e.detail.value }) },
  onAmountInput(e) { this.setData({ totalFee: parseInt(e.detail.value) || 1 }) },

  // 切换 Tab
  onTabChange(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.tab) })
  },

  // ========== 统一调用入口 ==========
  async _call(action, data) {
    // 云托管直连：响应直接来自 Express，格式为 { code, msg, data }
    // 无需像云函数版那样解开 webfn 的双层信封
    const res = await callCloudRun(action, data)

    // 响应结构规范化：兼容 {status, data} 和 {code, data} 两种格式
    if (res && typeof res.code === 'undefined' && typeof res.status !== 'undefined') {
      return {
        code: (res.status >= 200 && res.status < 300) ? 0 : -1,
        msg: res.message || res.msg || '',
        data: res.data,
      }
    }
    return res
  },

  // ========== 下单 + 支付 ==========
  async handlePay() {
    if (!this.data.openid) {
      wx.showToast({ title: 'openid 未获取', icon: 'error' })
      return
    }

    this.setData({ loading: true, payResult: '' })
    try {
      const outTradeNo = generateOutTradeNo()
      this.setData({ outTradeNo })

      this.setData({ payResult: '下单中...' })
      // ⚠️ 安全警告：以下金额取自前端输入，仅用于示例演示。
      // 🚨 生产环境中，订单金额必须从后端数据库查询，严禁使用前端传值！
      // 攻击者可通过篡改请求将金额改为 1 分完成支付。
      const res = await this._call('wxpay_order', {
        description: this.data.description,
        out_trade_no: outTradeNo,
        amount: { total: this.data.totalFee, currency: 'CNY' },
        payer: { openid: this.data.openid },
      })

      console.log('下单结果:', res)
      this.setData({ payResult: JSON.stringify(res, null, 2) })

      if (res.code !== 0) {
        wx.showToast({ title: res.msg || '下单失败', icon: 'error' })
        return
      }

      const payData = res.data?.data || res.data
      if (!payData) {
        this.setData({ payResult: '下单成功但未获取到支付参数:\n' + JSON.stringify(res, null, 2) })
        return
      }

      await wx.requestPayment({
        timeStamp: payData.timeStamp,
        nonceStr: payData.nonceStr,
        package: payData.package ?? ('prepay_id=' + payData.prepay_id),
        signType: 'RSA',
        paySign: payData.paySign,
      })

      wx.showToast({ title: '支付成功', icon: 'success' })
      this.setData({ payResult: '✅ 支付成功！建议点击"查询订单"确认。' })

    } catch (err) {
      console.error('支付失败:', err)
      if (err.errMsg && err.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消', icon: 'none' })
        this.setData({ payResult: '用户取消支付' })
      } else {
        this.setData({ payResult: '❌ 错误:\n' + JSON.stringify(err, null, 2) })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // ========== 查单 ==========
  async handleQuery() {
    if (!this.data.outTradeNo) {
      wx.showToast({ title: '请先下单', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '查询中...' })
    
    try {
      this.setData({ payResult: '查询订单中...' })
      const res = await this._call('wxpay_query_order_by_out_trade_no', {
        out_trade_no: this.data.outTradeNo,
      })
      
      wx.hideLoading()
      
      console.log('查询订单结果:', res)
      this.setData({ payResult: JSON.stringify(res, null, 2) })
      
      // 保存订单信息（用于退款）
      if (res.code === 0 && res.data) {
        // 解开嵌套：Controller 返回 { code:0, data: { status, data: {实际订单} } }
        const orderData = res.data.data || res.data
        const tradeState = orderData.trade_state
        const transactionId = orderData.transaction_id || ''
        const totalFee = orderData.amount?.total || this.data.totalFee
        
        this.setData({
          tradeState,
          transactionId,
          totalFee,
          refundFee: totalFee,
        })
        
        let title = '查询成功'
        let icon = 'success'
        
        if (tradeState === 'SUCCESS') {
          title = '✅ 支付成功'
        } else if (tradeState === 'NOTPAY') {
          title = '⏳ 未支付'
          icon = 'none'
        } else if (tradeState === 'CLOSED') {
          title = '❌ 已关闭'
          icon = 'none'
        } else if (tradeState === 'REFUND') {
          title = '💰 转入退款'
          icon = 'none'
        }
        
        wx.showToast({ 
          title: title, 
          icon: icon,
          duration: 2000 
        })
      }
      
    } catch (err) {
      wx.hideLoading()
      console.error('查单失败:', err)
      this.setData({ payResult: '查单失败:\n' + JSON.stringify(err, null, 2) })
      
      wx.showModal({
        title: '查询失败',
        content: err.msg || err.message || '请稍后重试',
        showCancel: false,
      })
    }
  },

  // ========== 关单（优化版：先查询状态）==========
  async handleClose() {
    if (!this.data.outTradeNo) {
      wx.showToast({ title: '请先下单', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '检查订单状态...' })
    
    try {
      console.log('[关单] 第一步：查询订单状态')
      const queryResult = await this._call('wxpay_query_order_by_out_trade_no', {
        out_trade_no: this.data.outTradeNo,
      })
      
      wx.hideLoading()
      
      console.log('[关单] 订单状态:', queryResult)
      
      if (queryResult.code === 0 && queryResult.data) {
        // 解开嵌套：Controller 返回 { code:0, data: { status, data: {实际订单} } }
        const orderData = queryResult.data.data || queryResult.data
        const tradeState = orderData.trade_state
        const stateDesc = getTradeStateDesc(tradeState)
        
        this.setData({
          payResult: `当前订单状态:\n\n状态: ${tradeState}\n说明: ${stateDesc}\n\n${JSON.stringify(orderData, null, 2)}`,
        })
        
        if (tradeState === 'SUCCESS') {
          wx.showModal({
            title: '订单已支付',
            content: `该订单已完成支付（¥${((orderData.amount?.total || 0) / 100).toFixed(2)}）\n\n无法关闭订单，是否需要退款？`,
            confirmText: '去退款',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.showRefundDialog()
              }
            }
          })
          return
        }
        
        if (tradeState === 'CLOSED') {
          wx.showToast({ title: '订单已经关闭', icon: 'success', duration: 2000 })
          return
        }
        
        if (tradeState === 'REFUND') {
          wx.showModal({
            title: '订单已退款',
            content: '该订单已经发起退款，无法关闭',
            showCancel: false,
          })
          return
        }
        
        if (tradeState === 'NOTPAY' || tradeState === 'USERPAYING') {
          const confirm = await new Promise((resolve) => {
            wx.showModal({
              title: '确认关闭订单',
              content: `订单号: ${this.data.outTradeNo}\n状态: ${stateDesc}\n\n确认要关闭吗？`,
              confirmColor: '#ff0000',
              success: (res) => resolve(res.confirm),
            })
          })
          
          if (!confirm) return
          
          console.log('[关单] 第二步：执行关闭')
          wx.showLoading({ title: '正在关闭订单...' })
          
          const closeResult = await this._call('wxpay_close_order', {
            out_trade_no: this.data.outTradeNo,
          })
          
          wx.hideLoading()
          
          console.log('[关单] 结果:', closeResult)
          
          this.setData({
            payResult: `关单结果:\n\n${JSON.stringify(closeResult, null, 2)}`,
          })
          
          if (closeResult.code === 0) {
            wx.showToast({ title: '订单已关闭', icon: 'success' })
          } else {
            wx.showModal({
              title: '关闭失败',
              content: closeResult.msg || '未知错误',
              showCancel: false,
            })
          }
          return
        }
        
        wx.showModal({
          title: '无法关闭订单',
          content: `当前订单状态为"${stateDesc}"，不支持关闭操作`,
          showCancel: false,
        })
      } else {
        wx.showModal({
          title: '查询订单失败',
          content: queryResult.msg || '无法获取订单状态',
          showCancel: false,
        })
      }
      
    } catch (err) {
      wx.hideLoading()
      console.error('[关单] 失败:', err)
      
      let title = '操作失败'
      let content = err.msg || err.message || '未知错误'
      
      if (err.code === 'PARAM_ERROR' && content.includes('商户订单号错误')) {
        title = '提示'
        content = '订单状态已变更，无法关闭。\n可能原因：订单已支付、已关闭或已退款。'
      }
      
      this.setData({
        payResult: `操作失败:\n\n${JSON.stringify(err, null, 2)}`,
      })
      
      wx.showModal({
        title,
        content,
        showCancel: false,
      })
    }
  },

  // ========== 退款功能 ==========

  /**
   * 显示退款对话框
   */
  async showRefundDialog() {
    if (!this.data.outTradeNo) {
      wx.showToast({ title: '请先下单', icon: 'none' })
      return
    }

    wx.showLoading({ title: '查询订单中...' })
    
    try {
      const queryResult = await this._call('wxpay_query_order_by_out_trade_no', {
        out_trade_no: this.data.outTradeNo,
      })

      wx.hideLoading()

      if (queryResult.code === 0 && queryResult.data) {
        // 解开嵌套：Controller 返回 { code:0, data: { status, data: {实际订单} } }
        const orderData = queryResult.data.data || queryResult.data
        const tradeState = orderData.trade_state
        const totalFee = orderData.amount?.total || 0
        const transactionId = orderData.transaction_id || ''

        if (tradeState !== 'SUCCESS') {
          wx.showModal({
            title: '无法退款',
            content: `订单状态为"${orderData.trade_state_desc || getTradeStateDesc(tradeState)}"，只有已支付的订单才能退款`,
            showCancel: false,
          })
          return
        }

        this.setData({
          tradeState,
          transactionId,
          totalFee,
          refundFee: totalFee,
        })

        wx.showModal({
          title: '确认退款',
          content: `订单金额：¥${(totalFee / 100).toFixed(2)}\n退款金额：¥${(totalFee / 100).toFixed(2)}\n\n确认要退款吗？`,
          confirmText: '确认退款',
          confirmColor: '#07c160',
          success: (res) => {
            if (res.confirm) {
              this.handleRefund()
            }
          }
        })

      } else {
        wx.showModal({
          title: '查询失败',
          content: queryResult.msg || '无法查询订单状态',
          showCancel: false,
        })
      }

    } catch (err) {
      wx.hideLoading()
      console.error('[退款] 查询订单失败:', err)
      wx.showModal({
        title: '查询失败',
        content: err.msg || err.message || '请稍后重试',
        showCancel: false,
      })
    }
  },

  /**
   * 发起退款
   */
  async handleRefund() {
    if (!this.data.outTradeNo) {
      wx.showToast({ title: '订单号缺失', icon: 'none' })
      return
    }

    if (this.data.tradeState !== 'SUCCESS') {
      wx.showToast({ title: '订单未支付成功', icon: 'none' })
      return
    }

    wx.showLoading({ title: '正在退款...' })

    try {
      const outRefundNo = this.generateRefundNo()
      this.setData({ outRefundNo })

      console.log('[退款] 开始退款，退款单号:', outRefundNo)

      const refundResult = await this._call('wxpay_refund', {
        out_trade_no: this.data.outTradeNo,
        out_refund_no: outRefundNo,
        reason: this.data.refundReason,
        amount: {
          total: this.data.totalFee,
          refund: this.data.refundFee,
          currency: 'CNY',
        },
      })

      wx.hideLoading()

      console.log('[退款] 结果:', refundResult)

      this.setData({
        payResult: `退款结果:\n\n${JSON.stringify(refundResult, null, 2)}`,
      })

      if (refundResult.code === 0) {
        const refundData = refundResult.data?.data || refundResult.data
        const refundStatus = refundData?.status
        
        let title = '退款成功'
        let content = `退款单号: ${outRefundNo}\n金额: ¥${(this.data.refundFee / 100).toFixed(2)}`

        if (refundStatus === 'SUCCESS') {
          title = '✅ 退款成功'
          content += '\n\n退款已到账'
        } else if (refundStatus === 'PROCESSING') {
          title = '⏳ 退款处理中'
          content += '\n\n退款正在处理，请稍后查询'
        }

        wx.showModal({
          title,
          content,
          confirmText: '查询退款',
          cancelText: '知道了',
          success: (res) => {
            if (res.confirm) {
              this.handleQueryRefund()
            }
          }
        })

      } else {
        wx.showModal({
          title: '退款失败',
          content: refundResult.msg || '退款申请失败，请稍后重试',
          showCancel: false,
        })
      }

    } catch (err) {
      wx.hideLoading()
      console.error('[退款] 失败:', err)

      let errorMsg = err.msg || err.message || '退款失败'
      
      if (err.code === 'PARAM_ERROR') {
        errorMsg = '参数错误：' + errorMsg
      } else if (err.code === 'FREQUENCY_LIMITED') {
        errorMsg = '操作过于频繁，请稍后再试'
      } else if (err.code === 'NOT_ENOUGH') {
        errorMsg = '商户账户余额不足'
      }

      this.setData({
        payResult: `退款失败:\n\n${JSON.stringify(err, null, 2)}`,
      })

      wx.showModal({
        title: '退款失败',
        content: errorMsg,
        showCancel: false,
      })
    }
  },

  /**
   * 查询退款
   */
  async handleQueryRefund() {
    if (!this.data.outRefundNo) {
      wx.showToast({ title: '请先发起退款', icon: 'none' })
      return
    }

    wx.showLoading({ title: '查询退款中...' })

    try {
      const queryResult = await this._call('wxpay_refund_query', {
        out_refund_no: this.data.outRefundNo,
      })

      wx.hideLoading()

      console.log('[退款查询] 结果:', queryResult)

      this.setData({
        payResult: `退款查询结果:\n\n${JSON.stringify(queryResult, null, 2)}`,
      })

      if (queryResult.code === 0) {
        const refundData = queryResult.data?.data || queryResult.data
        const refundStatus = refundData?.status
        const stateDesc = getRefundStateDesc(refundStatus)
        let icon = 'none'

        if (refundStatus === 'SUCCESS') {
          icon = 'success'
        }

        wx.showToast({ 
          title: stateDesc, 
          icon: icon,
          duration: 2000 
        })

      } else {
        wx.showModal({
          title: '查询失败',
          content: queryResult.msg || '退款查询失败',
          showCancel: false,
        })
      }

    } catch (err) {
      wx.hideLoading()
      console.error('[退款查询] 失败:', err)
      
      this.setData({
        payResult: `退款查询失败:\n\n${JSON.stringify(err, null, 2)}`,
      })

      wx.showModal({
        title: '查询失败',
        content: err.msg || err.message || '请稍后重试',
        showCancel: false,
      })
    }
  },

  /**
   * 生成退款单号
   */
  generateRefundNo() {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
    const ms = Date.now().toString(36).slice(-4)
    const r1 = Math.random().toString(36).slice(2, 6).toUpperCase()
    const r2 = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `RF${timestamp}${ms}${r1}${r2}`.slice(0, 30)
  },

  // ========== 商家转账 ==========

  onTransferAmountInput(e) {
    this.setData({ transferAmount: parseInt(e.detail.value) || 0 })
  },

  onTransferRemarkInput(e) {
    this.setData({ transferRemark: e.detail.value })
  },

  /**
   * 生成转账单号
   */
  generateBillNo() {
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
    const ms = Date.now().toString(36).slice(-4)
    const r1 = Math.random().toString(36).slice(2, 6).toUpperCase()
    const r2 = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `TB${timestamp}${ms}${r1}${r2}`.slice(0, 30)
  },

  /**
   * 发起商家转账（0.3 - 2000 元免密）
   */
  async handleTransfer() {
    if (!this.data.openid) {
      wx.showToast({ title: 'openid 未获取', icon: 'error' })
      return
    }

    const amount = this.data.transferAmount
    if (!amount || amount < 30) {
      wx.showModal({
        title: '金额错误',
        content: '最低转账金额为 30 分（0.3 元）',
        showCancel: false,
      })
      return
    }
    if (amount >= 200000) {
      wx.showModal({
        title: '金额超限',
        content: '本模板仅支持免密小额转账（< 2000 元）。\n≥ 2000 元需实现 user_name 加密，请参考文档自行扩展。',
        showCancel: false,
      })
      return
    }

    const displayAmount = (amount / 100).toFixed(2)
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认转账',
        content: `向当前用户转账 ¥${displayAmount}\n\n⚠️ 转账成功后资金不可退回，请确认金额无误。`,
        confirmText: '确认转账',
        confirmColor: '#f7971e',
        success: (res) => resolve(res.confirm),
      })
    })

    if (!confirm) return

    this.setData({ transferLoading: true, transferResult: '' })

    try {
      const outBillNo = this.generateBillNo()

      this.setData({ outBillNo, transferResult: '发起转账中...' })

      console.log('[转账] 发起, out_bill_no:', outBillNo, 'amount:', amount)

      const res = await this._call('wxpay_transfer', {
        out_bill_no: outBillNo,
        transfer_scene_id: this.data.transferSceneId || '1000',
        openid: this.data.openid,
        transfer_amount: amount,
        transfer_remark: this.data.transferRemark || '模板测试转账',
        transfer_scene_report_infos: [
          { info_type: '活动名称', info_content: '测试转账活动' },
          { info_type: '奖励说明', info_content: this.data.transferRemark || '模板测试转账' },
        ],
      })

      console.log('[转账] 结果:', res)
      this.setData({ transferResult: `转账结果:\n\n${JSON.stringify(res, null, 2)}` })

      if (res.code === 0 && res.data) {
        // 解开嵌套：Controller 返回 { code:0, data: { status, data: {实际转账结果, mchId} } }
        const transferData = res.data.data || res.data
        const transferBillNo = transferData.transfer_bill_no || ''
        const packageInfo = transferData.package_info || ''
        const mchId = transferData.mchId || '' // 后端透传的商户号
        this.setData({ transferBillNo })

        // 如果返回了 package_info，说明是待用户确认模式，需要调起确认收款页面
        if (packageInfo) {
          console.log('[转账] 待用户确认，调起确认收款页面, mchId:', mchId, 'package_info:', packageInfo)
          if (wx.canIUse('requestMerchantTransfer')) {
            wx.requestMerchantTransfer({
              mchId: mchId,
              // ⚠️ 注意：前端用 appId（大写I），后端 API 用 appid（小写i），别搞混
              appId: wx.getAccountInfoSync().miniProgram.appId,
              package: packageInfo,
              success: (confirmRes) => {
                console.log('[转账] 用户确认收款页面展示成功:', confirmRes)
                this.setData({ transferResult: `转账结果:\n\n用户确认收款页面已展示\n单号: ${outBillNo}\n微信单号: ${transferBillNo}` })
              },
              fail: (confirmErr) => {
                console.error('[转账] 调起确认收款页面失败:', confirmErr)
                this.setData({ transferResult: `转账已受理，但调起确认收款页面失败:\n\n${JSON.stringify(confirmErr, null, 2)}\n\n请用户在微信"服务通知"中查看。` })
              },
            })
          } else {
            wx.showModal({
              title: '⚠️ 微信版本过低',
              content: '你的微信版本不支持调起确认收款页面，请更新至最新版本微信。',
              showCancel: false,
            })
          }
        } else {
          // 没有 package_info，可能是直接到账模式
          wx.showModal({
            title: '✅ 转账受理成功',
            content: `单号: ${outBillNo}\n微信单号: ${transferBillNo}\n金额: ¥${displayAmount}\n\n转账已受理，请稍后查询结果。`,
            confirmText: '查询转账',
            cancelText: '知道了',
            success: (modalRes) => {
              if (modalRes.confirm && outBillNo) {
                this.handleQueryTransferBill()
              }
            }
          })
        }
      } else {
        wx.showModal({
          title: '转账失败',
          content: res.msg || '转账申请失败，请检查参数或稍后重试',
          showCancel: false,
        })
      }

    } catch (err) {
      console.error('[转账] 失败:', err)

      let errorMsg = err.msg || err.message || '转账失败'
      if (typeof err === 'object' && err.data) {
        errorMsg = err.data.message || err.data.msg || errorMsg
      }

      this.setData({ transferResult: `转账失败:\n\n${JSON.stringify(err, null, 2)}` })

      wx.showModal({
        title: '转账失败',
        content: errorMsg,
        showCancel: false,
      })
    } finally {
      this.setData({ transferLoading: false })
    }
  },

  /**
   * 查询转账单
   */
  async handleQueryTransferBill() {
    if (!this.data.outBillNo) {
      wx.showToast({ title: '请先发起转账', icon: 'none' })
      return
    }

    wx.showLoading({ title: '查询转账中...' })

    try {
      const res = await this._call('wxpay_transfer_bill_query', {
        out_bill_no: this.data.outBillNo,
      })

      wx.hideLoading()

      console.log('[转账查询] 结果:', res)
      this.setData({ transferResult: `转账查询:\n\n${JSON.stringify(res, null, 2)}` })

      if (res.code === 0 && res.data) {
        // 解开嵌套：Controller 返回 { code:0, data: { status, data: {实际转账单} } }
        const billData = res.data.data || res.data

        // 判断微信支付 API 是否返回错误（如 404 NOT_FOUND）
        if (billData.code === 'NOT_FOUND' || res.data.status === 404) {
          wx.showModal({
            title: '记录不存在',
            content: `转账单号 "${this.data.outBillNo}" 在微信支付侧不存在。\n\n可能原因：\n1. 转账刚发起，微信还未入库（等几秒再试）\n2. 转账请求未成功受理`,
            showCancel: false,
          })
          return
        }

        const state = billData.state
        let title = '查询成功'

        if (state === 'SUCCESS') {
          title = '✅ 转账成功'
        } else if (state === 'PROCESSING') {
          title = '⏳ 转账处理中'
        } else if (state === 'FAIL') {
          title = '❌ 转账失败'
        } else if (state === 'WAIT_USER_CONFIRM') {
          title = '👤 待用户确认'
        } else if (state === 'TRANSFERING') {
          title = '⏳ 转账中'
        } else if (state === 'CANCELLED') {
          title = '🚫 已撤销'
        } else if (state === 'CANCELING') {
          title = '⏳ 撤销中'
        } else if (state === 'ACCEPTED') {
          title = '📋 已受理'
        }

        wx.showToast({ title, icon: 'none', duration: 2000 })
      } else {
        wx.showModal({
          title: '查询失败',
          content: res.msg || '查询转账单失败',
          showCancel: false,
        })
      }

    } catch (err) {
      wx.hideLoading()
      console.error('[转账查询] 失败:', err)
      this.setData({ transferResult: `转账查询失败:\n\n${JSON.stringify(err, null, 2)}` })
      wx.showModal({
        title: '查询失败',
        content: err.msg || err.message || '请稍后重试',
        showCancel: false,
      })
    }
  },

  /**
   * 复制订单号
   */
  handleCopyOrder() {
    if (!this.data.outTradeNo) return
    wx.setClipboardData({
      data: this.data.outTradeNo,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  /**
   * 复制退款单号
   */
  handleCopyRefund() {
    if (!this.data.outRefundNo) return
    wx.setClipboardData({
      data: this.data.outRefundNo,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },
})

const config = require('../../config')

Page({
  data: {
    openid: '',
    orders: [],
    loading: false
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      // 用户 openid（云函数返回）
      const openidRes = await wx.cloud.callFunction({ name: 'getUserInfo' })
      console.log('[my] getUserInfo result:', openidRes)
      const openid = openidRes.result && openidRes.result.openid
      this.setData({ openid: openid || '' })

      // 我的订单（只展示业务有意义的订单：已发货 / 退款中 / 已退款）
      const orderRes = await wx.cloud.callFunction({
        name: 'queryOrder',
        data: { list: true, statuses: ['delivered', 'refund_pending', 'refunded'] }
      })
      console.log('[my] orders:', orderRes)
      this.setData({
        orders: (orderRes.result && orderRes.result.orders) || []
      })
    } catch (e) {
      console.error('[my] loadData error:', e)
    } finally {
      this.setData({ loading: false })
    }
  },

  // 退款
  async onRefund(e) {
    const outTradeNo = e.currentTarget.dataset.outTradeNo
    if (!outTradeNo) return
    const confirm = await new Promise((resolve) => {
      wx.showModal({
        title: '确认退款',
        content: `确定要对订单 ${outTradeNo} 发起退款吗？`,
        success: (r) => resolve(r.confirm),
        fail: () => resolve(false)
      })
    })
    if (!confirm) return

    wx.showLoading({ title: '退款中...', mask: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'refundOrder', data: { outTradeNo } })
      wx.hideLoading()
      if (res.result && res.result.ok) {
        wx.showToast({ title: '退款已发起', icon: 'success' })
        this.loadData()
      } else {
        wx.showModal({ title: '提示', content: (res.result && res.result.error) || '退款失败', showCancel: false })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showModal({ title: '提示', content: err.errMsg || err.message || '退款失败', showCancel: false })
    }
  },

  formatPrice(price) {
    return (price / 100).toFixed(2)
  },

  statusText(status) {
    const map = {
      pending: '待支付',
      paid: '已支付',
      delivered: '已发货',
      refund_pending: '退款中',
      refunded: '已退款',
      closed: '已关闭'
    }
    return map[status] || status
  },

  statusClass(status) {
    return status === 'refunded' ? 'tag-refunded' : status === 'pending' || status === 'refund_pending' ? 'tag-pending' : ''
  }
})

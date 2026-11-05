const config = require('../../config')
const { buyGoods } = require('../../utils/pay')

Page({
  data: {
    goods: [],
    // 独立状态：buying[i]=true 表示第 i 个商品正在购买中
    buyingMap: {}
  },

  onLoad() {
    const goods = config.goods.map((g) => ({
      ...g,
      priceYuan: (g.price / 100).toFixed(2)
    }))
    this.setData({ goods })
  },

  // 点击购买
  async onBuy(e) {
    const index = e.currentTarget.dataset.index
    const product = this.data.goods[index]
    if (!product) return

    // 阻止同一商品重复点击（不影响其他商品）
    if (this.data.buyingMap[index]) return
    this.setData({ [`buyingMap.${index}`]: true })

    wx.showLoading({ title: '拉起支付中...', mask: true })
    try {
      await buyGoods(product, 1)
      wx.hideLoading()
      wx.showToast({ title: '支付成功', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      const msg = (err && err.errMsg) || err.message || '支付未完成'
      wx.showModal({ title: '提示', content: msg, showCancel: false })
    } finally {
      // 释放当前商品锁定，允许重试
      this.setData({ [`buyingMap.${index}`]: false })
    }
  }
})

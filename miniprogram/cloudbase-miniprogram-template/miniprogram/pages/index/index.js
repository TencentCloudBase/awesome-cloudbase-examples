Page({
  data: {
    openid: ''
  },
  onLoad() {
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        this.setData({
          openid: res.result.openid
        })
      },
      fail: err => {
        console.error('调用云函数失败', err)
      }
    })
  }
})
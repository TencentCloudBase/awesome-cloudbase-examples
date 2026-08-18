Component({
  /**
   * 组件的属性列表
   */
  properties: {
    showText: {
      type: Boolean,
      value: false
    },
    size: {
      type: String,
      value: 'normal' // normal, small, large
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    onTapBadge() {
      // 点击badge跳转到CloudBase AI ToolKit项目页
      wx.navigateToMiniProgram({
        appId: '', // 可以设置跳转到其他小程序
        path: '',
        fail: () => {
          // 如果无法跳转小程序，则复制链接到剪贴板
          wx.setClipboardData({
            data: 'https://github.com/TencentCloudBase/CloudBase-AI-ToolKit',
            success: () => {
              wx.showToast({
                title: '已复制链接',
                icon: 'success'
              })
            }
          })
        }
      })
    }
  }
}) 
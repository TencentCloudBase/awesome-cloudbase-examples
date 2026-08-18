import {
  getUserInfo,
  updateUserInfo,
  getOrderStats
} from '../../services/user';

Page({
  data: {
    userInfo: {},
    orderStats: {
      pendingPayment: 0,
      pendingDelivery: 0,
      pendingReceipt: 0,
      completed: 0,
    },
  },

  onShow() {
    if (this.data.userInfo.nickName) {
      this.loadOrderStats();
    } else {
      this.loadUserInfo();
    }
  },

  onPullDownRefresh() {
    // 下拉刷新
    Promise.all([this.loadUserInfo(), this.loadOrderStats()])
      .then(() => {
        wx.stopPullDownRefresh();
      })
      .catch(() => {
        wx.stopPullDownRefresh();
      });
  },

  async loadUserInfo() {
    try {
      const userInfo = await getUserInfo();
      if (userInfo) {
        this.setData({
          userInfo
        });
        wx.setStorageSync('userInfo', userInfo);
      } else {
        // 如果没有获取到用户信息，清除本地存储
        wx.removeStorageSync('userInfo');
        this.setData({
          userInfo: {}
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // 如果获取用户信息失败，清除本地存储
      wx.removeStorageSync('userInfo');
      this.setData({
        userInfo: {}
      });
    }
  },

  async loadOrderStats() {
    if (!this.data.userInfo.nickName) return;

    try {
      const stats = await getOrderStats();
      this.setData({
        orderStats: stats
      });
    } catch (error) {
      console.error('获取订单统计失败:', error);
    }
  },

  async getUserProfile() {
    if (this.data.userInfo.nickName) return;

    try {
      wx.showLoading({
        title: '正在登录'
      });
      const {
        userInfo
      } = await wx.getUserProfile({
        desc: '用于完善会员资料',
      });

      await updateUserInfo(userInfo);
      await this.loadUserInfo();
      await this.loadOrderStats();
      wx.hideLoading();
    } catch (error) {
      console.error('获取用户信息失败:', error);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none',
      });
    }
  },

  navigateToOrderList(e) {
    if (!this.data.userInfo.nickName) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: `/pages/order/list/index?type=${type}`,
    });
  },

  async navigateTo(e) {
    const db = wx.cloud.database()
    const testCollection = db.collection('test')

    // await testCollection.add({
    //   data: {
    //     name: 'test123'
    //   }
    // })

    const res = await testCollection.get()
    console.log(res);
    // if (!this.data.userInfo.nickName) {
    // 	wx.showToast({
    // 		title: '请先登录',
    // 		icon: 'none',
    // 	});
    // 	return;
    // }

    // const url = e.currentTarget.dataset.url;
    // wx.navigateTo({ url });
  },

  async logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 重置页面数据
            this.setData({
              userInfo: {},
              orderStats: {
                pendingPayment: 0,
                pendingDelivery: 0,
                pendingReceipt: 0,
                completed: 0,
              },
            });

            wx.showToast({
              title: '已退出登录',
              icon: 'success',
            });
          } catch (error) {
            console.error('退出登录失败:', error);
            wx.showToast({
              title: '退出登录失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },
});
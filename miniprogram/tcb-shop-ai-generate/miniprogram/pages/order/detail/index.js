// pages/order/detail/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    orderId: '',
    order: null,
    isLoading: true,
    statusSteps: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      this.loadOrderDetail();
    } else {
      wx.showToast({
        title: '订单ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载订单详情
   */
  loadOrderDetail: function () {
    this.setData({ isLoading: true });
    
    const db = wx.cloud.database();
    db.collection('orders')
      .doc(this.data.orderId)
      .get()
      .then(res => {
        if (!res.data) {
          throw new Error('订单不存在');
        }
        
        // 格式化订单数据
        const order = {
          ...res.data,
          statusText: this.getStatusText(res.data.status),
          createTimeFormatted: this.formatDate(res.data.createTime),
          payTimeFormatted: res.data.payTime ? this.formatDate(res.data.payTime) : '',
          shipTimeFormatted: res.data.shipTime ? this.formatDate(res.data.shipTime) : '',
          completeTimeFormatted: res.data.completeTime ? this.formatDate(res.data.completeTime) : '',
          totalAmount: res.data.totalAmount / 100 // 转换为元
        };
        
        // 生成订单状态步骤
        const statusSteps = this.generateStatusSteps(order);
        
        this.setData({
          order,
          statusSteps,
          isLoading: false
        });
      })
      .catch(err => {
        console.error('获取订单详情失败', err);
        wx.showToast({
          title: err.message || '获取订单详情失败',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      });
  },

  /**
   * 生成订单状态步骤
   */
  generateStatusSteps: function (order) {
    const steps = [
      {
        title: '下单',
        desc: `${order.createTimeFormatted}`,
        status: 'finish'
      },
      {
        title: '付款',
        desc: order.payTime ? `${order.payTimeFormatted}` : '等待付款',
        status: order.status === 'NOTPAY' ? 'wait' : 'finish'
      },
      {
        title: '发货',
        desc: order.shipTime ? `${order.shipTimeFormatted}` : '等待发货',
        status: ['NOTPAY', 'PAID'].includes(order.status) ? 'wait' : 'finish'
      },
      {
        title: '收货',
        desc: order.completeTime ? `${order.completeTimeFormatted}` : '等待收货',
        status: order.status === 'FINISHED' ? 'finish' : 'wait'
      }
    ];
    
    return steps;
  },

  /**
   * 获取订单状态文本
   */
  getStatusText: function (status) {
    const statusTextMap = {
      'NOTPAY': '待付款',
      'PAID': '待发货',
      'SHIPPED': '待收货',
      'FINISHED': '已完成',
      'CLOSED': '已关闭'
    };
    return statusTextMap[status] || '未知状态';
  },

  /**
   * 格式化日期
   */
  formatDate: function (date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 复制订单号
   */
  copyOrderId: function () {
    wx.setClipboardData({
      data: this.data.order.outTradeNo || this.data.orderId,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 继续支付
   */
  continuePay: function () {
    if (!this.data.order || this.data.order.status !== 'NOTPAY') {
      return;
    }
    
    wx.showLoading({
      title: '正在获取支付信息',
    });
    
    // 调用云函数重新获取支付参数
    wx.cloud.callFunction({
      name: 'wxpayFunctions',
      data: {
        type: 'wxpay_order',
        data: {
          outTradeNo: this.data.order.outTradeNo,
          totalAmount: this.data.order.totalAmount * 100, // 转换为分
          description: this.data.order.description,
          orderId: this.data.orderId
        }
      }
    })
    .then(res => {
      wx.hideLoading();
      
      if (!res.result || !res.result.success) {
        throw new Error(res.result?.message || '获取支付参数失败');
      }
      
      // 发起支付
      const payment = res.result.paymentParams;
      wx.requestPayment({
        ...payment,
        signType: 'RSA',
        success: () => {
          wx.showToast({
            title: '支付成功',
            icon: 'success',
            success: () => {
              // 刷新订单详情
              this.loadOrderDetail();
            }
          });
        },
        fail: (err) => {
          console.error('支付失败', err);
          if (err.errMsg !== 'requestPayment:fail cancel') {
            wx.showToast({
              title: '支付失败',
              icon: 'none'
            });
          }
        }
      });
    })
    .catch(err => {
      wx.hideLoading();
      console.error('获取支付参数失败', err);
      wx.showToast({
        title: err.message || '获取支付参数失败',
        icon: 'none'
      });
    });
  },

  /**
   * 确认收货
   */
  confirmReceive: function () {
    if (!this.data.order || this.data.order.status !== 'SHIPPED') {
      return;
    }
    
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中',
          });
          
          // 调用云函数更新订单状态
          wx.cloud.callFunction({
            name: 'wxpayFunctions',
            data: {
              type: 'update_order_status',
              data: {
                orderId: this.data.orderId,
                status: 'FINISHED',
                completeTime: new Date()
              }
            }
          })
          .then(res => {
            wx.hideLoading();
            
            if (!res.result || !res.result.success) {
              throw new Error(res.result?.message || '确认收货失败');
            }
            
            wx.showToast({
              title: '确认收货成功',
              icon: 'success',
              success: () => {
                // 刷新订单详情
                this.loadOrderDetail();
              }
            });
          })
          .catch(err => {
            wx.hideLoading();
            console.error('确认收货失败', err);
            wx.showToast({
              title: err.message || '确认收货失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    this.loadOrderDetail();
    wx.stopPullDownRefresh();
  }
})
// pages/order/list/index.js
Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		orders: [],
		isLoading: true,
		tabs: ['全部', '待付款', '待发货', '待收货', '已完成'],
		activeTab: 0,
		statusMap: {
			0: '', // 全部
			1: 'NOTPAY', // 待付款
			2: 'PAID', // 待发货
			3: 'SHIPPED', // 待收货
			4: 'FINISHED', // 已完成
		},
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		// 如果有传入的tab参数，切换到对应的tab
		if (options.tab) {
			const tab = parseInt(options.tab);
			if (!isNaN(tab) && tab >= 0 && tab < this.data.tabs.length) {
				this.setData({ activeTab: tab });
			}
		}
		this.loadOrders();
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		// 每次显示页面时刷新订单列表
		this.loadOrders();
	},

	/**
	 * 加载订单列表
	 */
	loadOrders: function () {
		this.setData({ isLoading: true });

		const db = wx.cloud.database();
		const status = this.data.statusMap[this.data.activeTab];

		// 构建查询条件
		let query = db.collection('orders').where({
			_openid: wx.getStorageSync('userInfo')._openid,
		});

		// 如果不是"全部"标签，添加状态过滤
		if (status) {
			query = query.where({
				status: status,
			});
		}

		// 按创建时间倒序排列
		query
			.orderBy('createTime', 'desc')
			.get()
			.then((res) => {
				const orders = res.data.map((order) => {
					// 格式化订单数据
					return {
						...order,
						statusText: this.getStatusText(order.status),
						createTimeFormatted: this.formatDate(order.createTime),
						totalAmount: order.totalAmount / 100, // 转换为元
					};
				});

				this.setData({
					orders,
					isLoading: false,
				});
			})
			.catch((err) => {
				console.error('获取订单列表失败', err);
				wx.showToast({
					title: '获取订单失败',
					icon: 'none',
				});
				this.setData({ isLoading: false });
			});
	},

	/**
	 * 切换标签
	 */
	onTabChange: function (e) {
		const index = e.currentTarget.dataset.index;
		this.setData(
			{
				activeTab: index,
			},
			() => {
				this.loadOrders();
			}
		);
	},

	/**
	 * 查看订单详情
	 */
	viewOrderDetail: function (e) {
		const orderId = e.currentTarget.dataset.id;
		wx.navigateTo({
			url: `/pages/order/detail/index?id=${orderId}`,
		});
	},

	/**
	 * 继续支付
	 */
	continuePay: function (e) {
		const order = e.currentTarget.dataset.order;

		wx.showLoading({
			title: '正在获取支付信息',
		});

		// 调用云函数重新获取支付参数
		wx.cloud
			.callFunction({
				name: 'wxpayFunctions',
				data: {
					type: 'wxpay_order',
					data: {
						outTradeNo: order.outTradeNo,
						totalAmount: order.totalAmount * 100, // 转换为分
						description: order.description,
						orderId: order._id,
					},
				},
			})
			.then((res) => {
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
								// 刷新订单列表
								this.loadOrders();
							},
						});
					},
					fail: (err) => {
						console.error('支付失败', err);
						if (err.errMsg !== 'requestPayment:fail cancel') {
							wx.showToast({
								title: '支付失败',
								icon: 'none',
							});
						}
					},
				});
			})
			.catch((err) => {
				wx.hideLoading();
				console.error('获取支付参数失败', err);
				wx.showToast({
					title: err.message || '获取支付参数失败',
					icon: 'none',
				});
			});
	},

	/**
	 * 获取订单状态文本
	 */
	getStatusText: function (status) {
		const statusTextMap = {
			NOTPAY: '待付款',
			PAID: '待发货',
			SHIPPED: '待收货',
			FINISHED: '已完成',
			CLOSED: '已关闭',
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
	 * 下拉刷新
	 */
	onPullDownRefresh: function () {
		this.loadOrders();
		wx.stopPullDownRefresh();
	},
});

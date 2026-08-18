// pages/checkout/checkout.js
Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		checkoutItems: [],
		address: null,
		totalPrice: 0,
		deliveryFee: 0,
		finalPrice: 0,
		remark: '',
		isLoading: true,
		isSubmitting: false,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		this.setData({ isLoading: true });

		// 从缓存中获取地址信息
		const address = wx.getStorageSync('selectedAddress');
		if (address) {
			this.setData({ address });
		}

		// 获取购物车中选中的商品
		this.getSelectedCartItems();
	},

	/**
	 * 获取购物车中选中的商品
	 */
	getSelectedCartItems: function () {
		const db = wx.cloud.database();

		db.collection('cart')
			.where({
				_openid: wx.getStorageSync('userInfo')._openid,
				selected: true,
			})
			.get()
			.then((res) => {
				const checkoutItems = res.data;

				if (checkoutItems.length === 0) {
					wx.showToast({
						title: '请先选择商品',
						icon: 'none',
						success: () => {
							setTimeout(() => {
								wx.navigateBack();
							}, 1500);
						},
					});
					return;
				}

				// 计算商品总价
				let totalPrice = 0;
				checkoutItems.forEach((item) => {
					totalPrice += item.price * item.count;
				});

				// 设置配送费，这里简单设置为固定值，实际应用中可能需要根据地址、重量等计算
				const deliveryFee = totalPrice >= 99 ? 0 : 10;

				this.setData({
					checkoutItems,
					totalPrice,
					deliveryFee,
					finalPrice: totalPrice + deliveryFee,
					isLoading: false,
				});
			})
			.catch((err) => {
				console.error('获取购物车选中商品失败', err);
				wx.showToast({
					title: '获取商品信息失败',
					icon: 'none',
				});
				this.setData({ isLoading: false });
			});
	},

	/**
	 * 选择收货地址
	 */
	chooseAddress: function () {
		wx.chooseAddress({
			success: (res) => {
				this.setData({ address: res });
				wx.setStorageSync('selectedAddress', res);
			},
			fail: (err) => {
				if (err.errMsg !== 'chooseAddress:fail cancel') {
					wx.showModal({
						title: '提示',
						content: '获取地址失败，请检查是否授予了地址权限',
						showCancel: false,
					});
				}
			},
		});
	},

	/**
	 * 备注输入事件处理
	 */
	onRemarkInput: function (e) {
		this.setData({
			remark: e.detail.value,
		});
	},

	/**
	 * 提交订单
	 */
	submitOrder: async function () {
		// 检查是否选择了收货地址
		if (false && !this.data.address) {
			wx.showToast({
				title: '请选择收货地址',
				icon: 'none',
			});
			return;
		}

		// 检查是否有商品
		if (this.data.checkoutItems.length === 0) {
			wx.showToast({
				title: '请选择商品',
				icon: 'none',
			});
			return;
		}

		this.setData({ isSubmitting: true });

		try {
			// 准备订单数据
			const orderItems = this.data.checkoutItems.map((item) => ({
				id: item._id,
				name: item.name,
				price: item.price,
				count: item.count,
			}));

			// 调用微信支付云函数
			const res = await wx.cloud.callFunction({
				name: 'wxpayFunctions',
				data: {
					type: 'wxpay_order',
					data: {
						orderItems,
						totalAmount: Math.round(this.data.finalPrice * 100), // 转换为分
						description: orderItems.map((item) => item.name).join('、'),
						cartItemIds: this.data.checkoutItems.map((item) => item._id),
						address: this.data.address,
						remark: this.data.remark,
					},
				},
			});

			if (!res.result || !res.result.success) {
				throw new Error(res.result?.message || '创建订单失败');
			}

			// 发起支付
			const payment = res.result.paymentParams;
			await wx.requestPayment({
				...payment,
				signType: 'RSA',
				success: () => {
					wx.showToast({
						title: '支付成功',
						icon: 'success',
						success: () => {
							setTimeout(() => {
								// 跳转到订单列表页
								wx.redirectTo({
									url: '/pages/order/list/index',
								});
							}, 1500);
						},
					});
				},
				fail: (err) => {
					console.error('支付失败', err);
					// 支付失败后跳转到订单详情页
					wx.redirectTo({
						url: `/pages/order/detail/index?id=${res.result.orderId}`,
					});
				},
			});
		} catch (err) {
			console.error('提交订单失败', err);
			wx.showToast({
				title: err.message || '订单提交失败，请重试',
				icon: 'none',
			});
		} finally {
			this.setData({ isSubmitting: false });
		}
	},
});

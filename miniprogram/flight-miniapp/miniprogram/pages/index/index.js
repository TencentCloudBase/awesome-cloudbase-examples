Page({
	data: {
		openid: '',
		searchText: '',
	},
	onLoad() {
		// 初始化页面
		console.log('Flight Comparison App 启动');
		wx.cloud.callFunction({
			name: 'getOpenId',
			success: (res) => {
				this.setData({
					openid: res.result.openid,
				});
			},
			fail: (err) => {
				console.error('调用云函数失败', err);
			},
		});
	},

	// 搜索输入事件
	onSearchInput(e) {
		this.setData({ searchText: e.detail.value });
	},

	// 清空搜索
	clearSearch() {
		this.setData({ searchText: '' });
		wx.showToast({
			title: '已清空搜索',
			icon: 'success',
			duration: 1000,
		});
	},

	// 执行搜索
	performSearch() {
		const searchText = this.data.searchText.trim();
		if (!searchText) {
			wx.showToast({
				title: '请输入搜索内容',
				icon: 'none',
			});
			return;
		}

		// 将搜索参数存储到本地存储中
		wx.setStorageSync('searchFromHome', {
			searchText: searchText,
			timestamp: Date.now(),
		});

		// 使用switchTab跳转，保持底部导航栏
		wx.switchTab({
			url: '/pages/flight-comparison/flight-comparison',
		});
	},

	// 跳转到航班对比主页
	goToFlightComparison() {
		wx.switchTab({
			url: '/pages/flight-comparison/flight-comparison',
		});
	},

	// 跳转到预订页面
	goToBookings() {
		wx.switchTab({
			url: '/pages/bookings/bookings',
		});
	},
});

Page({
	data: {
		userInfo: null,
		hasUserInfo: false,
		menuItems: [
			{ title: '个人信息', icon: '👤', type: 'info' },
			{ title: '飞行历史', icon: '✈️', type: 'history' },
			{ title: '设置', icon: '⚙️', type: 'settings' },
			{ title: '帮助与反馈', icon: '💬', type: 'help' },
			{ title: '关于我们', icon: 'ℹ️', type: 'about' },
		],
	},

	onLoad() {
		this.getUserInfo();
	},

	getUserInfo() {
		// 获取全局用户信息
		const app = getApp();
		if (app.globalData.userInfo) {
			this.setData({
				userInfo: app.globalData.userInfo,
				hasUserInfo: true,
			});
		}
	},

	async getUserProfile() {
		try {
			const res = await wx.getUserProfile({
				desc: '用于完善用户资料',
			});

			this.setData({
				userInfo: res.userInfo,
				hasUserInfo: true,
			});

			// 保存到全局数据
			getApp().globalData.userInfo = res.userInfo;

			// 可以将用户信息保存到云数据库
			this.saveUserInfo(res.userInfo);
		} catch (error) {
			console.error('获取用户信息失败:', error);
		}
	},

	async saveUserInfo(userInfo) {
		try {
			await wx.cloud.callFunction({
				name: 'saveUserInfo',
				data: { userInfo },
			});
		} catch (error) {
			console.error('保存用户信息失败:', error);
		}
	},

	handleMenuTap(e) {
		const type = e.currentTarget.dataset.type;

		switch (type) {
			case 'info':
				wx.showModal({
					title: '个人信息',
					content: '查看和编辑个人信息',
					showCancel: false,
				});
				break;
			case 'history':
				wx.showModal({
					title: '飞行历史',
					content: '查看历史航班记录',
					showCancel: false,
				});
				break;
			case 'settings':
				wx.showModal({
					title: '设置',
					content: '应用设置和偏好',
					showCancel: false,
				});
				break;
			case 'help':
				wx.showModal({
					title: '帮助与反馈',
					content: '获取帮助或提供反馈',
					showCancel: false,
				});
				break;
			case 'about':
				wx.showModal({
					title: '关于我们',
					content: 'Flight Comparison App v1.0.0\n基于微信小程序+云开发构建',
					showCancel: false,
				});
				break;
		}
	},
});

/**
 * 用户服务
 */

const db = wx.cloud.database();
const _ = db.command;

/**
 * 获取用户信息
 */
export const getUserInfo = async () => {
	try {
		const { result } = await wx.cloud.callFunction({
			name: 'getOpenId',
		});

		if (!result || !result.openid) {
			throw new Error('获取openid失败');
		}

		const { data } = await db
			.collection('users')
			.where({
				_openid: result.openid,
			})
			.get();

		return data[0] || null;
	} catch (error) {
		console.error('获取用户信息失败：', error);
		return null;
	}
};

/**
 * 更新用户信息
 * @param {Object} userInfo - 微信用户信息
 */
export const updateUserInfo = async (userInfo) => {
	try {
		const { result } = await wx.cloud.callFunction({
			name: 'getOpenId',
		});

		if (!result || !result.openid) {
			throw new Error('获取openid失败');
		}

		const { data } = await db
			.collection('users')
			.where({
				_openid: result.openid,
			})
			.get();

		// 处理头像字段，将avatarUrl映射为avatar
		const userData = {
			...userInfo,
			avatar: userInfo.avatarUrl,
			lastLogin: new Date(),
		};

		if (data.length === 0) {
			// 新用户，创建记录
			return await db.collection('users').add({
				data: {
					...userData,
					createTime: new Date(),
				},
			});
		} else {
			// 更新现有用户信息
			return await db
				.collection('users')
				.where({
					_openid: result.openid,
				})
				.update({
					data: userData,
				});
		}
	} catch (error) {
		console.error('更新用户信息失败：', error);
		throw error;
	}
};

/**
 * 获取用户订单统计
 */
export const getOrderStats = async () => {
	try {
		const { result } = await wx.cloud.callFunction({
			name: 'getOpenId',
		});

		if (!result || !result.openid) {
			return {
				pendingPayment: 0,
				pendingDelivery: 0,
				pendingReceipt: 0,
				completed: 0,
			};
		}

		const { data } = await db
			.collection('orders')
			.where({
				_openid: result.openid,
			})
			.get();

		const stats = {
			pendingPayment: 0,
			pendingDelivery: 0,
			pendingReceipt: 0,
			completed: 0,
		};

		data.forEach((order) => {
			switch (order.status) {
				case 'PENDING_PAYMENT': // 待支付状态：订单已创建但尚未完成支付
					stats.pendingPayment++;
					break;
				case 'PENDING_DELIVERY': // 待发货状态：订单已支付但商家尚未发货
					stats.pendingDelivery++;
					break;
				case 'PENDING_RECEIPT': // 待收货状态：商家已发货但用户尚未确认收货
					stats.pendingReceipt++;
					break;
				case 'COMPLETED': // 已完成状态：订单已完成全部流程（已收货）
					stats.completed++;
					break;
			}
		});

		return stats;
	} catch (error) {
		console.error('获取订单统计失败：', error);
		return {
			pendingPayment: 0,
			pendingDelivery: 0,
			pendingReceipt: 0,
			completed: 0,
		};
	}
};

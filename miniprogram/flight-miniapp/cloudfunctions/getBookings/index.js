const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();

	try {
		// 查询用户的预订记录
		const result = await db
			.collection('bookings')
			.where({
				openid: wxContext.OPENID,
			})
			.orderBy('createTime', 'desc')
			.get();

		return {
			success: true,
			bookings: result.data,
			openid: wxContext.OPENID,
		};
	} catch (error) {
		console.error('获取预订数据失败:', error);

		return {
			success: false,
			error: error.message,
			bookings: [],
		};
	}
};

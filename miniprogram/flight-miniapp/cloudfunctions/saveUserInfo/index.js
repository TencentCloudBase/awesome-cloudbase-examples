const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext();

	try {
		const { userInfo } = event;

		// 保存或更新用户信息
		const result = await db
			.collection('users')
			.doc(wxContext.OPENID)
			.set({
				data: {
					openid: wxContext.OPENID,
					userInfo: userInfo,
					updateTime: new Date(),
					createTime: new Date(),
				},
			});

		return {
			success: true,
			result: result,
			openid: wxContext.OPENID,
		};
	} catch (error) {
		console.error('保存用户信息失败:', error);

		return {
			success: false,
			error: error.message,
		};
	}
};

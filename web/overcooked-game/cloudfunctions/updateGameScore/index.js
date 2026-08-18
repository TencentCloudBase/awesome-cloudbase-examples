const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
	try {
		const { mode, score, completedOrders, gameTime, nickname } = event;
		const { OPENID } = cloud.getWXContext();

		console.log('收到请求参数:', {
			mode,
			score,
			completedOrders,
			gameTime,
			nickname,
		});
		console.log('用户OPENID:', OPENID);
		console.log('完整的context信息:', JSON.stringify(context, null, 2));

		// 验证参数
		if (!mode || typeof score !== 'number' || score < 0) {
			return {
				success: false,
				message: '无效的参数',
			};
		}

		if (!['single', 'multiplayer'].includes(mode)) {
			return {
				success: false,
				message: '无效的游戏模式',
			};
		}

		// 获取用户标识：优先使用TCB_UUID，其次是OPENID，最后生成匿名ID
		let userId;
		console.log('environment', typeof context.environment, context.environment);
		const environment = JSON.parse(context.environment);
		if (environment && environment.TCB_UUID) {
			userId = environment.TCB_UUID;
			console.log('使用TCB_UUID作为用户标识:', userId);
		} else if (OPENID) {
			userId = OPENID;
			console.log('使用OPENID作为用户标识:', userId);
		} else {
			userId = `anonymous_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			console.log('生成匿名用户标识:', userId);
		}

		// 计算积分（基于多个因素）
		let points = Math.floor(score);

		// 完成订单数量加分
		if (completedOrders) {
			points += completedOrders * 10;
		}

		// 时间加分（时间越长，基础分越高，但有上限）
		if (gameTime) {
			const timeBonus = Math.min((gameTime / 60) * 5, 50); // 最多50分时间奖励
			points += Math.floor(timeBonus);
		}

		console.log('计算得分:', points);

		// 查找或创建用户记录
		const userQuery = await db
			.collection('game_scores')
			.where({
				_openid: userId,
				mode: mode,
			})
			.get();

		console.log('查询用户记录结果:', userQuery.data.length);

		const now = new Date();

		if (userQuery.data.length === 0) {
			// 新用户，创建记录
			const defaultNickname = nickname || `玩家${userId.slice(-4)}`;
			console.log('创建新用户记录，昵称:', defaultNickname);

			await db.collection('game_scores').add({
				data: {
					_openid: userId,
					mode: mode,
					nickname: defaultNickname,
					totalScore: points,
					bestScore: points,
					gamesPlayed: 1,
					totalCompletedOrders: completedOrders || 0,
					totalGameTime: gameTime || 0,
					lastPlayTime: now,
					createTime: now,
				},
			});
		} else {
			// 更新现有记录
			const userData = userQuery.data[0];
			console.log('更新现有用户记录:', userData._id);

			const updateData = {
				totalScore: userData.totalScore + points,
				bestScore: Math.max(userData.bestScore || 0, points),
				gamesPlayed: (userData.gamesPlayed || 0) + 1,
				totalCompletedOrders:
					(userData.totalCompletedOrders || 0) + (completedOrders || 0),
				totalGameTime: (userData.totalGameTime || 0) + (gameTime || 0),
				lastPlayTime: now,
			};

			// 如果提供了昵称，也更新昵称
			if (nickname) {
				updateData.nickname = nickname;
			}

			await db.collection('game_scores').doc(userData._id).update({
				data: updateData,
			});
		}

		// 计算新的排名
		const rankResult = await db
			.collection('game_scores')
			.where({
				mode: mode,
				totalScore: _.gt((userQuery.data[0]?.totalScore || 0) + points),
			})
			.count();

		const newRank = rankResult.total + 1;
		console.log('计算排名:', newRank);

		return {
			success: true,
			data: {
				pointsEarned: points,
				newTotalScore: (userQuery.data[0]?.totalScore || 0) + points,
				newRank: newRank,
				gamesPlayed: (userQuery.data[0]?.gamesPlayed || 0) + 1,
				userId: userId, // 返回使用的用户ID，便于调试
			},
		};
	} catch (error) {
		console.error('更新游戏分数失败:', error);
		return {
			success: false,
			message: '更新分数失败，请稍后重试',
		};
	}
};

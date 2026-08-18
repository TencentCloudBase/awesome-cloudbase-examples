const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
	try {
		const { mode } = event; // 'single' 或 'multiplayer'
		const { OPENID } = cloud.getWXContext();

		// 验证模式参数
		if (!['single', 'multiplayer'].includes(mode)) {
			return {
				success: false,
				message: '无效的游戏模式',
			};
		}

		// 获取排行榜数据（前50名）
		const leaderboardResult = await db
			.collection('game_scores')
			.where({
				mode: mode,
			})
			.orderBy('totalScore', 'desc')
			.limit(50)
			.get();

		// 处理排行榜数据，添加排名
		const leaderboard = leaderboardResult.data.map((player, index) => ({
			userId: player._openid,
			nickname: player.nickname || `玩家${player._openid.slice(-4)}`,
			score: player.totalScore,
			rank: index + 1,
			gamesPlayed: player.gamesPlayed || 0,
			lastPlayTime: player.lastPlayTime,
		}));

		// 获取当前用户的统计数据
		let userStats = null;
		try {
			const userResult = await db
				.collection('game_scores')
				.where({
					_openid: OPENID,
					mode: mode,
				})
				.get();

			if (userResult.data.length > 0) {
				const userData = userResult.data[0];

				// 计算用户排名
				const userRankResult = await db
					.collection('game_scores')
					.where({
						mode: mode,
						totalScore: _.gt(userData.totalScore),
					})
					.count();

				userStats = {
					score: userData.totalScore,
					rank: userRankResult.total + 1,
					gamesPlayed: userData.gamesPlayed || 0,
					lastPlayTime: userData.lastPlayTime,
				};
			}
		} catch (userError) {
			console.error('获取用户统计失败:', userError);
		}

		return {
			success: true,
			data: {
				leaderboard,
				userStats,
			},
		};
	} catch (error) {
		console.error('获取排行榜失败:', error);
		return {
			success: false,
			message: '获取排行榜失败，请稍后重试',
		};
	}
};

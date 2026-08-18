const cloud = require('wx-server-sdk');

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 生成6位房间码
function generateRoomCode() {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// 创建游戏房间
async function createRoom(event) {
	const playerInfo = event.playerInfo;

	try {
		const roomCode = generateRoomCode();
		const roomData = {
			roomCode: roomCode,
			status: 'waiting',
			maxPlayers: 2,
			currentPlayers: 1,
			players: [
				{
					playerId: playerInfo.playerId,
					nickname: playerInfo.nickname,
					isHost: true,
					isReady: false,
					position: { x: 100, y: 300 },
					holding: null,
				},
			],
			gameState: {
				score: 0,
				timeLeft: 180,
				completedOrders: 0,
				currentOrder: null,
				stations: [
					{
						id: 'cutting',
						type: 'cutting',
						x: 200,
						y: 280,
						isProcessing: false,
						contents: [],
						processedItem: null,
					},
					{
						id: 'cooking',
						type: 'cooking',
						x: 350,
						y: 280,
						isProcessing: false,
						contents: [],
						processedItem: null,
						isOnFire: false,
					},
					{
						id: 'serving',
						type: 'serving',
						x: 500,
						y: 280,
						isProcessing: false,
						contents: [],
						processedItem: null,
					},
				],
				plates: [],
				groundItems: [],
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const result = await db.collection('game_rooms').add({
			data: roomData,
		});

		return {
			success: true,
			roomId: result._id,
			roomCode: roomCode,
			roomData: roomData,
		};
	} catch (error) {
		console.error('创建房间失败:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}

// 加入游戏房间
async function joinRoom(event) {
	const roomCode = event.roomCode;
	const playerInfo = event.playerInfo;

	try {
		// 查找房间
		const roomQuery = await db
			.collection('game_rooms')
			.where({
				roomCode: roomCode,
				status: 'waiting',
			})
			.get();

		if (roomQuery.data.length === 0) {
			return {
				success: false,
				error: '房间不存在或已开始游戏',
			};
		}

		const room = roomQuery.data[0];

		// 检查房间是否已满
		if (room.currentPlayers >= room.maxPlayers) {
			return {
				success: false,
				error: '房间已满',
			};
		}

		// 检查玩家是否已在房间中
		const existingPlayer = room.players.find(function (p) {
			return p.playerId === playerInfo.playerId;
		});
		if (existingPlayer) {
			return {
				success: false,
				error: '您已在房间中',
			};
		}

		// 添加玩家到房间
		const newPlayer = {
			playerId: playerInfo.playerId,
			nickname: playerInfo.nickname,
			isHost: false,
			isReady: false,
			position: { x: 700, y: 300 }, // 第二个玩家的起始位置
			holding: null,
		};

		const updatedPlayers = room.players.concat([newPlayer]);

		await db
			.collection('game_rooms')
			.doc(room._id)
			.update({
				data: {
					currentPlayers: room.currentPlayers + 1,
					players: updatedPlayers,
					updatedAt: new Date(),
				},
			});

		// 获取更新后的房间信息
		const updatedRoom = await db.collection('game_rooms').doc(room._id).get();

		return {
			success: true,
			roomId: room._id,
			roomData: updatedRoom.data,
		};
	} catch (error) {
		console.error('加入房间失败:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}

// 离开游戏房间
async function leaveRoom(event) {
	const roomId = event.roomId;
	const playerId = event.playerId;

	try {
		const room = await db.collection('game_rooms').doc(roomId).get();

		if (!room.data) {
			return {
				success: false,
				error: '房间不存在',
			};
		}

		const players = room.data.players.filter(function (p) {
			return p.playerId !== playerId;
		});

		// 如果房间空了，删除房间
		if (players.length === 0) {
			await db.collection('game_rooms').doc(roomId).remove();
			return {
				success: true,
				roomDeleted: true,
			};
		}

		// 如果离开的是房主，将房主权限转给第一个玩家
		const leavingPlayer = room.data.players.find(function (p) {
			return p.playerId === playerId;
		});
		if (players.length > 0 && leavingPlayer && leavingPlayer.isHost) {
			players[0].isHost = true;
		}

		await db
			.collection('game_rooms')
			.doc(roomId)
			.update({
				data: {
					currentPlayers: players.length,
					players: players,
					updatedAt: new Date(),
				},
			});

		return {
			success: true,
			roomDeleted: false,
		};
	} catch (error) {
		console.error('离开房间失败:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}

// 获取房间信息
async function getRoomInfo(event) {
	const roomId = event.roomId;

	try {
		const room = await db.collection('game_rooms').doc(roomId).get();

		if (!room.data) {
			return {
				success: false,
				error: '房间不存在',
			};
		}

		return {
			success: true,
			roomData: room.data,
		};
	} catch (error) {
		console.error('获取房间信息失败:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}

// 开始游戏
async function startGame(event) {
	const roomId = event.roomId;
	const playerId = event.playerId;

	try {
		const room = await db.collection('game_rooms').doc(roomId).get();

		if (!room.data) {
			return {
				success: false,
				error: '房间不存在',
			};
		}

		// 检查是否是房主
		const player = room.data.players.find(function (p) {
			return p.playerId === playerId;
		});
		if (!player || !player.isHost) {
			return {
				success: false,
				error: '只有房主可以开始游戏',
			};
		}

		// 检查是否有足够的玩家
		if (room.data.currentPlayers < 2) {
			return {
				success: false,
				error: '需要2名玩家才能开始游戏',
			};
		}

		// 生成初始订单
		const recipes = ['simple_salad', 'tomato_salad', 'sandwich', 'cooked_meal'];
		const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];

		const recipeData = {
			simple_salad: {
				name: '简单沙拉',
				ingredients: ['chopped_lettuce'],
				points: 10,
				time: 60,
			},
			tomato_salad: {
				name: '番茄沙拉',
				ingredients: ['chopped_tomato', 'chopped_lettuce'],
				points: 15,
				time: 90,
			},
			sandwich: {
				name: '三明治',
				ingredients: ['bread', 'cooked_tomato', 'chopped_lettuce'],
				points: 25,
				time: 120,
			},
			cooked_meal: {
				name: '熟食套餐',
				ingredients: ['cooked_tomato', 'cooked_lettuce', 'bread'],
				points: 30,
				time: 150,
			},
		};

		const selectedRecipe = recipeData[randomRecipe];
		const currentOrder = {
			name: selectedRecipe.name,
			ingredients: selectedRecipe.ingredients,
			points: selectedRecipe.points,
			time: selectedRecipe.time,
			id: randomRecipe,
			timeRemaining: selectedRecipe.time,
		};

		// 更新完整的gameState对象，避免在null字段上创建嵌套字段的问题
		const updatedGameState = {
			score: room.data.gameState.score || 0,
			timeLeft: 180,
			completedOrders: room.data.gameState.completedOrders || 0,
			currentOrder: currentOrder,
			stations: room.data.gameState.stations || [
				{
					id: 'cutting',
					type: 'cutting',
					x: 200,
					y: 280,
					isProcessing: false,
					contents: [],
					processedItem: null,
				},
				{
					id: 'cooking',
					type: 'cooking',
					x: 350,
					y: 280,
					isProcessing: false,
					contents: [],
					processedItem: null,
					isOnFire: false,
				},
				{
					id: 'serving',
					type: 'serving',
					x: 500,
					y: 280,
					isProcessing: false,
					contents: [],
					processedItem: null,
				},
			],
			plates: room.data.gameState.plates || [],
			groundItems: room.data.gameState.groundItems || [],
		};

		// 使用set方法完全替换文档，避免字段冲突
		const updatedRoomData = {
			roomCode: room.data.roomCode,
			status: 'playing',
			maxPlayers: room.data.maxPlayers,
			currentPlayers: room.data.currentPlayers,
			players: room.data.players,
			gameState: updatedGameState,
			createdAt: room.data.createdAt,
			updatedAt: new Date(),
		};

		await db.collection('game_rooms').doc(roomId).set({
			data: updatedRoomData,
		});

		return {
			success: true,
			message: '游戏开始！',
		};
	} catch (error) {
		console.error('开始游戏失败:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}

exports.main = async function (event, context) {
	const action = event.action;

	switch (action) {
		case 'createRoom':
			return await createRoom(event);
		case 'joinRoom':
			return await joinRoom(event);
		case 'leaveRoom':
			return await leaveRoom(event);
		case 'getRoomInfo':
			return await getRoomInfo(event);
		case 'startGame':
			return await startGame(event);
		default:
			return {
				success: false,
				error: '未知操作',
			};
	}
};

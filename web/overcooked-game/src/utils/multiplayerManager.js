import cloudbase from './cloudbase';

class MultiplayerManager {
	constructor() {
		this.roomId = null;
		this.playerId = null;
		this.playerInfo = null;
		this.isHost = false;
		this.roomData = null;
		this.listeners = new Map();
		this.watcher = null; // 实时监听器
		this.fallbackPollingTimer = null;

		// 生成唯一玩家ID
		this.playerId = this.generatePlayerId();
	}

	// 生成玩家ID
	generatePlayerId() {
		return (
			'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
		);
	}

	// 设置玩家信息
	setPlayerInfo(nickname) {
		this.playerInfo = {
			playerId: this.playerId,
			nickname: nickname || `玩家${Math.floor(Math.random() * 1000)}`,
		};
	}

	// 创建房间
	async createRoom() {
		try {
			if (!this.playerInfo) {
				this.setPlayerInfo();
			}

			const result = await cloudbase.callFunction({
				name: 'gameRoom',
				data: {
					action: 'createRoom',
					playerInfo: this.playerInfo,
				},
			});

			if (result.result.success) {
				this.roomId = result.result.roomId;
				this.roomData = result.result.roomData;
				this.isHost = true;

				console.log('房间创建成功:', {
					roomId: this.roomId,
					roomCode: result.result.roomCode,
					roomData: this.roomData,
				});

				// 开始实时监听房间状态
				this.startRealtimeWatch();

				return {
					success: true,
					roomCode: result.result.roomCode,
					roomData: this.roomData,
				};
			} else {
				throw new Error(result.result.error);
			}
		} catch (error) {
			console.error('创建房间失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 加入房间
	async joinRoom(roomCode) {
		try {
			if (!this.playerInfo) {
				this.setPlayerInfo();
			}

			const result = await cloudbase.callFunction({
				name: 'gameRoom',
				data: {
					action: 'joinRoom',
					roomCode,
					playerInfo: this.playerInfo,
				},
			});

			if (result.result.success) {
				this.roomId = result.result.roomId;
				this.roomData = result.result.roomData;
				this.isHost = false;

				console.log('加入房间成功:', {
					roomId: this.roomId,
					roomCode: roomCode,
					roomData: this.roomData,
				});

				// 开始实时监听房间状态
				this.startRealtimeWatch();

				return {
					success: true,
					roomData: this.roomData,
				};
			} else {
				throw new Error(result.result.error);
			}
		} catch (error) {
			console.error('加入房间失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 开始实时监听房间数据变化
	startRealtimeWatch() {
		if (!this.roomId) {
			console.error('无法开始实时监听：roomId为空');
			return;
		}

		console.log('🔥 开始实时监听房间数据变化:', this.roomId);

		try {
			// 确保先登录
			cloudbase
				.ensureLogin()
				.then((loginState) => {
					console.log('✅ 登录状态确认，开始设置实时监听', {
						loginType: loginState?.loginType,
						uid: loginState?.uid,
						isAnonymous: loginState?.isAnonymous,
					});

					// 获取数据库实例
					const db = cloudbase.app.database();

					console.log('📊 数据库实例获取成功，设置监听器...');

					// 使用正确的实时监听API：collection().where().watch()
					this.watcher = db
						.collection('game_rooms')
						.where({
							_id: this.roomId,
						})
						.watch({
							onChange: (snapshot) => {
								console.log('📡 房间数据实时更新 - 原始数据:', snapshot);
								console.log(
									'📡 snapshot类型:',
									typeof snapshot,
									'docs数量:',
									snapshot.docs?.length
								);

								if (snapshot.docs && snapshot.docs.length > 0) {
									const newRoomData = snapshot.docs[0];
									const oldRoomData = this.roomData;

									console.log('🔄 数据对比:', {
										oldPlayers: oldRoomData?.players?.length || 0,
										newPlayers: newRoomData?.players?.length || 0,
										oldStatus: oldRoomData?.status,
										newStatus: newRoomData.status,
										playersChanged:
											JSON.stringify(oldRoomData?.players) !==
											JSON.stringify(newRoomData?.players),
										positionChanged: this.checkPositionChanged(
											oldRoomData,
											newRoomData
										),
									});

									// 更新本地房间数据
									this.roomData = newRoomData;

									// 触发房间更新事件
									console.log('🚀 触发 roomUpdated 事件');
									this.emit('roomUpdated', newRoomData);

									// 如果游戏状态有变化，触发游戏状态更新事件
									if (
										newRoomData.gameState &&
										JSON.stringify(newRoomData.gameState) !==
											JSON.stringify(oldRoomData?.gameState)
									) {
										console.log('🎮 游戏状态实时更新:', newRoomData.gameState);
										this.emit('gameStateUpdated', newRoomData.gameState);
									}

									// 触发状态变化事件（保持向后兼容）
									this.emit('roomStateChanged', {
										oldState: oldRoomData,
										newState: newRoomData,
									});
								} else {
									console.warn('⚠️ 实时监听收到空数据:', snapshot);
								}
							},
							onError: (error) => {
								console.error('❌ 实时监听出错:', error);
								console.error('错误详情:', {
									message: error.message,
									code: error.code,
									name: error.name,
									stack: error.stack,
								});

								// 检查是否是权限问题
								if (
									error.code === 'PERMISSION_DENIED' ||
									error.message?.includes('permission')
								) {
									console.error(
										'🚫 实时监听权限被拒绝，可能是数据库安全规则限制'
									);
								}

								// 实时监听失败，启用备用轮询
								console.log('🔄 实时监听失败，启用备用轮询机制');
								this.startFallbackPolling();
							},
						});

					console.log('✅ 实时监听器设置成功，监听器对象:', this.watcher);

					// 测试监听器是否真的工作
					setTimeout(() => {
						console.log('🧪 5秒后检查监听器状态:', {
							watcherExists: !!this.watcher,
							watcherType: typeof this.watcher,
						});
					}, 5000);
				})
				.catch((error) => {
					console.error('❌ 登录失败，无法设置实时监听:', error);
					// 登录失败时启用备用轮询
					console.log('🔄 登录失败，启用备用轮询机制');
					this.startFallbackPolling();
				});
		} catch (error) {
			console.error('❌ 启动实时监听失败:', error);
			console.error('错误详情:', {
				message: error.message,
				code: error.code,
				name: error.name,
				stack: error.stack,
			});
			// 如果实时监听不可用，启用备用轮询
			console.log('🔄 实时监听不可用，启用备用轮询机制');
			this.startFallbackPolling();
		}
	}

	// 检查位置是否发生变化
	checkPositionChanged(oldRoomData, newRoomData) {
		if (!oldRoomData?.players || !newRoomData?.players) return false;

		for (let i = 0; i < newRoomData.players.length; i++) {
			const newPlayer = newRoomData.players[i];
			const oldPlayer = oldRoomData.players.find(
				(p) => p.playerId === newPlayer.playerId
			);

			if (!oldPlayer) continue;

			if (
				oldPlayer.position?.x !== newPlayer.position?.x ||
				oldPlayer.position?.y !== newPlayer.position?.y
			) {
				return true;
			}
		}

		return false;
	}

	// 重新连接实时监听
	reconnectRealtimeWatch() {
		console.log('🔄 尝试重新连接实时监听...');

		// 停止当前监听器
		this.stopRealtimeWatch();

		// 延迟重新连接
		setTimeout(() => {
			if (this.roomId) {
				this.startRealtimeWatch();
			}
		}, 2000);
	}

	// 启动备用轮询机制
	startFallbackPolling() {
		if (this.fallbackPollingTimer) {
			clearInterval(this.fallbackPollingTimer);
		}

		console.log('🔄 启动备用轮询机制...');

		this.fallbackPollingTimer = setInterval(async () => {
			if (!this.roomId) return;

			try {
				const result = await cloudbase.callFunction({
					name: 'gameRoom',
					data: {
						action: 'getRoomInfo',
						roomId: this.roomId,
					},
				});

				if (result.result && result.result.success) {
					const newRoomData = result.result.roomData;
					const oldRoomData = this.roomData;

					// 检查是否有状态变化
					if (JSON.stringify(newRoomData) !== JSON.stringify(oldRoomData)) {
						console.log('📊 轮询检测到房间状态变化:', {
							oldPlayers: oldRoomData?.players?.length || 0,
							newPlayers: newRoomData?.players?.length || 0,
							oldStatus: oldRoomData?.status,
							newStatus: newRoomData.status,
						});

						// 更新本地房间数据
						this.roomData = newRoomData;

						// 触发房间更新事件
						console.log('🚀 轮询触发 roomUpdated 事件');
						this.emit('roomUpdated', newRoomData);

						// 如果游戏状态有变化，触发游戏状态更新事件
						if (
							newRoomData.gameState &&
							JSON.stringify(newRoomData.gameState) !==
								JSON.stringify(oldRoomData?.gameState)
						) {
							console.log('🎮 轮询检测到游戏状态更新:', newRoomData.gameState);
							this.emit('gameStateUpdated', newRoomData.gameState);
						}
					}
				}
			} catch (error) {
				console.error('❌ 轮询获取房间状态失败:', error);
			}
		}, 2000); // 每2秒轮询一次
	}

	// 停止实时监听
	stopRealtimeWatch() {
		if (this.watcher) {
			console.log('🛑 停止实时监听');
			try {
				this.watcher.close();
			} catch (error) {
				console.error('停止监听器时出错:', error);
			}
			this.watcher = null;
		}
	}

	// 停止备用轮询
	stopFallbackPolling() {
		if (this.fallbackPollingTimer) {
			console.log('🛑 停止备用轮询');
			clearInterval(this.fallbackPollingTimer);
			this.fallbackPollingTimer = null;
		}
	}

	// 离开房间
	async leaveRoom() {
		try {
			if (!this.roomId) return { success: true };

			// 停止实时监听和备用轮询
			this.stopRealtimeWatch();
			this.stopFallbackPolling();

			const result = await cloudbase.callFunction({
				name: 'gameRoom',
				data: {
					action: 'leaveRoom',
					roomId: this.roomId,
					playerId: this.playerId,
				},
			});

			// 清理状态
			this.roomId = null;
			this.roomData = null;
			this.isHost = false;

			return {
				success: true,
			};
		} catch (error) {
			console.error('离开房间失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 开始游戏
	async startGame() {
		try {
			if (!this.isHost) {
				throw new Error('只有房主可以开始游戏');
			}

			const result = await cloudbase.callFunction({
				name: 'gameRoom',
				data: {
					action: 'startGame',
					roomId: this.roomId,
					playerId: this.playerId,
				},
			});

			if (result.result.success) {
				return { success: true };
			} else {
				throw new Error(result.result.error);
			}
		} catch (error) {
			console.error('开始游戏失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 同步玩家操作
	async syncPlayerAction(actionType, actionData) {
		try {
			if (!this.roomId) return Promise.resolve();

			return await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'syncPlayerAction',
					roomId: this.roomId,
					playerId: this.playerId,
					actionType,
					actionData,
				},
			});
		} catch (error) {
			console.error('同步玩家操作失败:', error);
			return Promise.reject(error);
		}
	}

	// 同步盘子状态
	async syncPlateState(
		plateId,
		contents,
		plateType,
		position,
		visible,
		active
	) {
		try {
			if (!this.roomId) return Promise.resolve();

			return await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'syncPlayerAction',
					roomId: this.roomId,
					playerId: this.playerId,
					actionType: 'plateUpdate',
					actionData: {
						plateId,
						contents,
						plateType,
						position,
						visible,
						active,
					},
				},
			});
		} catch (error) {
			console.error('同步盘子状态失败:', error);
			return Promise.reject(error);
		}
	}

	// 同步工作台状态
	async syncStationState(stationId, stationData) {
		try {
			if (!this.roomId) return Promise.resolve();

			return await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'syncPlayerAction',
					roomId: this.roomId,
					playerId: this.playerId,
					actionType: 'stationUpdate',
					actionData: {
						stationId,
						...stationData,
					},
				},
			});
		} catch (error) {
			console.error('同步工作台状态失败:', error);
			return Promise.reject(error);
		}
	}

	// 同步洗碗槽状态
	async syncWashStationState(washStationId, washStationData) {
		try {
			if (!this.roomId) return Promise.resolve();

			return await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'syncPlayerAction',
					roomId: this.roomId,
					playerId: this.playerId,
					actionType: 'washStationUpdate',
					actionData: {
						washStationId,
						...washStationData,
					},
				},
			});
		} catch (error) {
			console.error('同步洗碗槽状态失败:', error);
			return Promise.reject(error);
		}
	}

	// 同步地面物品
	async syncGroundItem(action, itemData) {
		try {
			if (!this.roomId) return Promise.resolve();

			return await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'syncPlayerAction',
					roomId: this.roomId,
					playerId: this.playerId,
					actionType: 'groundItemUpdate',
					actionData: {
						action, // 'add' 或 'remove'
						...itemData,
					},
				},
			});
		} catch (error) {
			console.error('同步地面物品失败:', error);
			return Promise.reject(error);
		}
	}

	// 更新游戏状态
	async updateGameState(gameStateUpdate) {
		try {
			if (!this.roomId) return;

			await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'updateGameState',
					roomId: this.roomId,
					gameStateUpdate,
				},
			});
		} catch (error) {
			console.error('更新游戏状态失败:', error);
		}
	}

	// 完成订单
	async completeOrder(orderData) {
		try {
			if (!this.roomId) return;

			const result = await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'completeOrder',
					roomId: this.roomId,
					orderData,
				},
			});

			return result.result;
		} catch (error) {
			console.error('完成订单失败:', error);
			return { success: false, error: error.message };
		}
	}

	// 结束游戏
	async endGame(finalScore) {
		try {
			if (!this.roomId) return;

			const result = await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'endGame',
					roomId: this.roomId,
					finalScore,
				},
			});

			return result.result;
		} catch (error) {
			console.error('结束游戏失败:', error);
			return { success: false, error: error.message };
		}
	}

	// 事件监听
	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(callback);
	}

	// 移除事件监听
	off(event, callback) {
		if (this.listeners.has(event)) {
			const callbacks = this.listeners.get(event);
			const index = callbacks.indexOf(callback);
			if (index > -1) {
				callbacks.splice(index, 1);
			}
		}
	}

	// 触发事件
	emit(event, data) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error('事件回调执行失败:', error);
				}
			});
		}
	}

	// 获取当前玩家信息
	getCurrentPlayer() {
		if (!this.roomData || !this.playerId) return null;
		return this.roomData.players.find((p) => p.playerId === this.playerId);
	}

	// 获取其他玩家信息
	getOtherPlayers() {
		if (!this.roomData || !this.playerId) return [];
		return this.roomData.players.filter((p) => p.playerId !== this.playerId);
	}

	// 获取房间状态
	getRoomStatus() {
		return this.roomData?.status || 'unknown';
	}

	// 获取游戏状态（本地）
	getGameState() {
		return this.roomData?.gameState || null;
	}

	// 从服务器获取游戏状态
	async getGameStateFromServer(roomId) {
		try {
			if (roomId) {
				// 如果传入了roomId，从服务器获取
				const result = await cloudbase.callFunction({
					name: 'gameRoom',
					data: {
						action: 'getRoomInfo',
						roomId: roomId,
					},
				});

				if (result.result && result.result.success) {
					return {
						success: true,
						gameState: result.result.roomData.gameState,
					};
				} else {
					return {
						success: false,
						error: result.result ? result.result.error : '获取游戏状态失败',
					};
				}
			} else {
				// 如果没有传入roomId，返回本地缓存的游戏状态
				return {
					success: true,
					gameState: this.roomData?.gameState || null,
				};
			}
		} catch (error) {
			console.error('获取游戏状态失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 获取房间数据
	getRoomData() {
		return this.roomData;
	}

	// 检查是否在房间中
	isInRoom() {
		return !!this.roomId;
	}

	// 检查是否是房主
	isRoomHost() {
		return this.isHost;
	}

	// 获取服务器时间（用于时间同步）
	async getServerTime() {
		try {
			const result = await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'getServerTime',
				},
			});

			if (result.result && result.result.success) {
				return {
					success: true,
					serverTime: result.result.serverTime,
					localTime: new Date().getTime(),
					offset: result.result.serverTime - new Date().getTime(), // 服务器时间 - 本地时间
				};
			}

			return {
				success: false,
				error: result.result ? result.result.error : '获取服务器时间失败',
			};
		} catch (error) {
			console.error('获取服务器时间失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 开始游戏（设置服务器时间戳）
	async startMultiplayerGame(roomId, gameDuration = 180000) {
		try {
			const result = await cloudbase.callFunction({
				name: 'gameSync',
				data: {
					action: 'startGame',
					roomId: roomId,
					gameDuration: gameDuration,
				},
			});

			if (result.result && result.result.success) {
				console.log('🎮 多人游戏开始成功:', {
					gameStartTime: result.result.gameStartTime,
					gameEndTime: result.result.gameEndTime,
					gameDuration: result.result.gameDuration,
				});

				return {
					success: true,
					gameStartTime: result.result.gameStartTime,
					gameEndTime: result.result.gameEndTime,
					gameDuration: result.result.gameDuration,
				};
			}

			return {
				success: false,
				error: result.result ? result.result.error : '开始游戏失败',
			};
		} catch (error) {
			console.error('开始多人游戏失败:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	}

	// 计算剩余时间（基于服务器时间戳）
	calculateTimeLeft(gameStartTime, gameDuration, serverTimeOffset = 0) {
		const currentTime = new Date().getTime() + serverTimeOffset;
		const elapsedTime = currentTime - gameStartTime;
		const timeLeft = Math.max(0, gameDuration - elapsedTime);

		return {
			timeLeft: timeLeft,
			timeLeftSeconds: Math.ceil(timeLeft / 1000),
			elapsedTime: elapsedTime,
			isGameOver: timeLeft <= 0,
		};
	}
}

// 创建单例实例
const multiplayerManager = new MultiplayerManager();

export default multiplayerManager;

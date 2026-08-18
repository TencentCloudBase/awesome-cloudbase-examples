import { defineStore } from 'pinia';
import { nanoid } from 'nanoid';
import { useRouter } from 'vue-router';
import { 
  initBoard, 
  checkWin, 
  isBoardFull, 
  PLAYER_ROLES, 
  GAME_STATUS 
} from '@/utils/gameUtils';
import { 
  createRoom, 
  getRoomById, 
  updateRoom, 
  watchRoom,
  callFunction,
  db 
} from '@/utils/cloudbase';

// 本地存储键
const STORAGE_KEY = 'game_state';
const PLAYER_NAME_KEY = 'player_name'; // 添加昵称存储的key

export const useGameStore = defineStore('game', {
  state: () => ({
    roomId: null,
    roomPassword: null,
    playerRole: null,
    playerName: localStorage.getItem(PLAYER_NAME_KEY) || '', // 从本地存储加载昵称
    playerId: null, // 添加玩家ID字段用于识别
    gameStatus: GAME_STATUS.WAITING,
    board: initBoard(),
    currentTurn: PLAYER_ROLES.BLACK,
    blackPlayer: null,
    whitePlayer: null,
    lastMove: null,
    winner: null,
    isWatching: false,
    unwatchFunction: null,
    loading: false,
    error: null,
    battleReports: [],
    recentRooms: [], // 添加最近房间列表状态
  }),
  
  getters: {
    isMyTurn() {
      return this.playerRole === this.currentTurn;
    },
    
    shareLink() {
      if (!this.roomId) return '';
      // 获取当前页面URL的基础部分（包含子路径）
      const baseUrl = window.location.href.split('#')[0];
      return `${baseUrl}#/room/${this.roomId}`;
    },
    
    isGameOver() {
      return [
        GAME_STATUS.BLACK_WIN,
        GAME_STATUS.WHITE_WIN,
        GAME_STATUS.DRAW
      ].includes(this.gameStatus);
    }
  },
  
  actions: {
    // 创建新房间
    async createNewRoom(playerName, password) {
      try {
        this.loading = true;
        this.error = null;
        
        const playerId = nanoid();
        
        const roomData = {
          createdAt: new Date(),
          password: password,
          gameStatus: GAME_STATUS.WAITING,
          board: initBoard(),
          currentTurn: PLAYER_ROLES.BLACK,
          blackPlayer: {
            id: playerId,
            name: playerName
          },
          whitePlayer: null,
          lastMove: null,
          winner: null
        };
        
        const { id } = await createRoom(roomData);
        
        this.roomId = id;
        this.roomPassword = password;
        this.playerRole = PLAYER_ROLES.BLACK;
        this.playerName = playerName;
        this.playerId = playerId;
        this.gameStatus = GAME_STATUS.WAITING;
        this.board = initBoard();
        this.currentTurn = PLAYER_ROLES.BLACK;
        this.blackPlayer = roomData.blackPlayer;
        this.whitePlayer = null;
        this.lastMove = null;
        this.winner = null;
        
        this.startWatchingRoom(id);
        this.saveStateToLocalStorage();
        
        return id;
      } catch (error) {
        this.error = error.message || '创建房间失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 加入房间
    async joinRoom(roomId, password, playerName, playerId = null, mode = null) {
      try {
        this.loading = true;
        this.error = null;
        
        // 如果没有提供playerId，创建一个新的
        if (!playerId) {
          playerId = nanoid();
        }
        
        // 保存昵称到本地存储
        if (playerName) {
          localStorage.setItem(PLAYER_NAME_KEY, playerName);
        }
        
        // 使用云函数处理加入房间逻辑
        const { result } = await callFunction('gameRoom', {
          action: 'joinRoom',
          data: {
            roomId,
            password,
            player: {
              id: playerId,
              name: playerName
            },
            mode // 传递模式参数：spectate(观战) 或 replay(回放)
          }
        });
        
        if (!result.success) {
          throw new Error(result.message || '加入房间失败');
        }
        
        // 设置玩家角色和状态
        this.roomId = roomId;
        this.roomPassword = password;
        this.playerName = playerName;
        this.playerId = playerId;
        
        if (result.role === 'white') {
          this.playerRole = PLAYER_ROLES.WHITE;
          this.isWatching = false;
        } else {
          this.playerRole = PLAYER_ROLES.SPECTATOR;
          this.isWatching = true;
        }
        
        // 同步房间数据
        this.syncRoomData(result.roomInfo);
        
        // 开始监听房间变化
        this.startWatchingRoom(roomId);
        
        // 保存状态到本地存储
        this.saveStateToLocalStorage();
        
        // 更新战报
        let reportType = 'playing';
        let reportTitle = '对局进行中';
        
        if (mode === 'spectate') {
          reportType = 'spectate';
          reportTitle = '观战中';
        } else if (mode === 'replay') {
          reportType = 'replay';
          reportTitle = '查看回放';
        }
        
        this.addBattleReport({
          type: reportType,
          title: reportTitle,
          description: `${this.blackPlayer?.name || '黑方'} VS ${this.whitePlayer?.name || '白方'}`,
          roomId: roomId
        });
      } catch (error) {
        this.error = error.message || '加入房间失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 开始监听房间变化
    startWatchingRoom(roomId) {
      // 先清理之前的监听
      this.clearWatchRoom();
      
      if (!roomId) {
        console.warn('无效的房间ID，不能开始监听');
        return;
      }
      
      try {
        console.log('开始监听房间:', roomId);
        this.unwatchFunction = watchRoom(roomId, (room) => {
          this.syncRoomData(room);
        });
      } catch (error) {
        console.error('设置房间监听失败:', error);
        this.unwatchFunction = null;
      }
    },
    
    // 清理房间监听
    clearWatchRoom() {
      try {
        if (this.unwatchFunction) {
          if (typeof this.unwatchFunction.close === 'function') {
            this.unwatchFunction.close();
          } else {
            console.warn('监听对象没有close方法');
          }
        }
      } catch (error) {
        console.error('清理房间监听失败:', error);
      } finally {
        this.unwatchFunction = null;
      }
    },
    
    // 同步房间数据
    syncRoomData(room) {
      try {
        // 如果房间不存在，可能已被删除
        if (!room) {
          console.warn('房间不存在或已被删除，退出房间');
          this.exitGame();
          return;
        }
        
        this.gameStatus = room.gameStatus;
        this.board = room.board;
        this.currentTurn = room.currentTurn;
        this.blackPlayer = room.blackPlayer;
        this.whitePlayer = room.whitePlayer;
        this.lastMove = room.lastMove;
        this.winner = room.winner;
        
        // 根据获取的房间数据，尝试识别玩家角色
        this.updatePlayerRoleFromRoom(room);
        
        // 同步后保存状态
        this.saveStateToLocalStorage();
      } catch (error) {
        console.error('同步房间数据失败:', error);
        // 发生错误时，可以选择退出房间
        this.exitGame();
      }
    },
    
    // 根据房间数据和已保存的玩家ID更新角色信息
    updatePlayerRoleFromRoom(room) {
      if (this.playerId) {
        // 检查是否是黑棋玩家
        if (room.blackPlayer && room.blackPlayer.id === this.playerId) {
          this.playerRole = PLAYER_ROLES.BLACK;
          this.isWatching = false;
          return;
        }
        
        // 检查是否是白棋玩家
        if (room.whitePlayer && room.whitePlayer.id === this.playerId) {
          this.playerRole = PLAYER_ROLES.WHITE;
          this.isWatching = false;
          return;
        }
        
        // 如果都不是，则为观战者
        this.playerRole = PLAYER_ROLES.SPECTATOR;
        this.isWatching = true;
      }
    },
    
    // 保存状态到本地存储
    saveStateToLocalStorage() {
      if (this.roomId) {
        const stateToSave = {
          roomId: this.roomId,
          roomPassword: this.roomPassword,
          playerName: this.playerName,
          playerId: this.playerId,
          playerRole: this.playerRole,
          isWatching: this.isWatching
        };
        
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (error) {
          console.error('保存游戏状态到本地存储失败:', error);
        }
      }
    },
    
    // 从本地存储恢复状态
    loadStateFromLocalStorage() {
      try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const state = JSON.parse(savedState);
          return state;
        }
      } catch (error) {
        console.error('从本地存储恢复游戏状态失败:', error);
      }
      return null;
    },
    
    // 尝试自动重连到上次的房间
    async reconnectToRoom() {
      const savedState = this.loadStateFromLocalStorage();
      if (savedState && savedState.roomId) {
        try {
          this.loading = true;
          
          // 尝试获取房间信息
          const { data } = await getRoomById(savedState.roomId);
          if (data.length === 0) {
            this.clearSavedState();
            return { success: false, message: '房间不存在' };
          }
          
          const room = data[0];
          
          // 重新设置状态
          this.roomId = savedState.roomId;
          this.roomPassword = savedState.roomPassword;
          this.playerName = savedState.playerName;
          this.playerId = savedState.playerId;
          this.playerRole = savedState.playerRole;
          this.isWatching = savedState.isWatching;
          
          // 同步房间数据
          this.syncRoomData(room);
          
          // 开始监听房间变化
          this.startWatchingRoom(savedState.roomId);
          
          return { success: true, room };
        } catch (error) {
          console.error('重连房间失败:', error);
          this.clearSavedState();
          return { success: false, message: error.message || '重连房间失败' };
        } finally {
          this.loading = false;
        }
      }
      return { success: false, message: '没有找到保存的房间信息' };
    },
    
    // 清除保存的状态
    clearSavedState() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('清除保存的游戏状态失败:', error);
      }
    },
    
    // 落子
    async placeStone(row, col) {
      if (
        !this.roomId ||
        this.gameStatus !== GAME_STATUS.PLAYING ||
        !this.isMyTurn ||
        this.board[row][col] !== null
      ) {
        return false;
      }
      
      try {
        this.loading = true;
        this.error = null;
        
        // 使用云函数处理落子逻辑
        const { result } = await callFunction('gameRoom', {
          action: 'placeStone',
          data: {
            roomId: this.roomId,
            row,
            col,
            player: this.playerRole
          }
        });
        
        if (!result.success) {
          throw new Error(result.message || '落子失败');
        }
        
        // 如果游戏结束，处理战报
        if (this.winner || isBoardFull(this.board)) {
          await this.handleGameEnd();
        }
        
        return true;
      } catch (error) {
        this.error = error.message || '落子失败';
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // 重新开始游戏
    async restartGame() {
      if (!this.roomId || !this.isGameOver) {
        return false;
      }
      
      try {
        this.loading = true;
        this.error = null;
        
        await updateRoom(this.roomId, {
          gameStatus: GAME_STATUS.PLAYING,
          board: initBoard(),
          currentTurn: PLAYER_ROLES.BLACK,
          lastMove: null,
          winner: null
        });
        
        this.addBattleReport({
          type: 'playing',
          title: '新一轮对局',
          description: `${this.blackPlayer?.name} VS ${this.whitePlayer?.name}`,
          roomId: this.roomId
        });
        
        return true;
      } catch (error) {
        this.error = error.message || '重新开始游戏失败';
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // 退出游戏
    exitGame() {
      // 清理房间监听
      this.clearWatchRoom();
      
      // 重置所有状态
      this.roomId = null;
      this.roomPassword = null;
      this.playerRole = null;
      this.playerName = '';
      this.playerId = null;
      this.gameStatus = GAME_STATUS.WAITING;
      this.board = initBoard();
      this.currentTurn = PLAYER_ROLES.BLACK;
      this.blackPlayer = null;
      this.whitePlayer = null;
      this.lastMove = null;
      this.winner = null;
      this.isWatching = false;
      this.loading = false;
      this.error = null;
      
      // 清除本地存储的状态
      this.clearSavedState();
    },
    
    // 添加战报
    addBattleReport(report) {
      const newReport = {
        ...report,
        timestamp: new Date().getTime()
      };
      
      // 如果是相同房间的战报，更新而不是新增
      const index = this.battleReports.findIndex(r => r.roomId === report.roomId);
      if (index !== -1) {
        this.battleReports[index] = newReport;
      } else {
        this.battleReports.unshift(newReport);
        // 只保留最近的10条记录
        if (this.battleReports.length > 10) {
          this.battleReports.pop();
        }
      }
    },

    // 获取战报列表
    getBattleReports() {
      return this.battleReports;
    },

    // 获取最近的房间列表
    async fetchRecentRooms() {
      try {
        const { data } = await db.collection('game_rooms')
          .orderBy('updateTime', 'desc')
          .limit(10)
          .get();
        
        this.recentRooms = data;
        return data;
      } catch (error) {
        console.error('获取房间列表失败:', error);
        return [];
      }
    },

    // 获取房间列表用于展示
    getRecentRooms() {
      return this.recentRooms;
    },

    // 获取排行榜数据
    async fetchRankings() {
      try {
        const { result } = await callFunction('gameRoom', {
          action: 'getRankings',
          data: {}
        });

        if (!result.success) {
          throw new Error(result.message || '获取排行榜失败');
        }

        return result.rankings;
      } catch (error) {
        console.error('获取排行榜失败:', error);
        return [];
      }
    },

    // 游戏结束时的处理
    async handleGameEnd() {
      if (this.winner) {
        const winnerName = this.winner === 'BLACK' ? this.blackPlayer?.name : this.whitePlayer?.name;
        const loserName = this.winner === 'BLACK' ? this.whitePlayer?.name : this.blackPlayer?.name;
        
        this.addBattleReport({
          type: 'win',
          title: '对局结束',
          description: `${winnerName} 击败了 ${loserName}`,
          roomId: this.roomId
        });
      } else if (isBoardFull(this.board)) {
        this.addBattleReport({
          type: 'draw',
          title: '对局结束',
          description: `${this.blackPlayer?.name} 和 ${this.whitePlayer?.name} 打成平局`,
          roomId: this.roomId
        });
      }
    }
  }
}); 
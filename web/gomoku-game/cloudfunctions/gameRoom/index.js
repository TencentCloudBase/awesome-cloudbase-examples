// 云函数入口文件
const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command
const roomsCollection = db.collection('game_rooms')
const rankingsCollection = db.collection('user_rankings')

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event
  
  switch (action) {
    case 'createRoom':
      return createRoom(data)
    case 'joinRoom':
      return joinRoom(data)
    case 'updateRoom':
      return updateRoom(data)
    case 'placeStone':
      return placeStone(data)
    case 'getRoomInfo':
      return getRoomInfo(data)
    case 'restartGame':
      return restartGame(data)
    case 'getRankings':
      return getRankings(data)
    default:
      return {
        success: false,
        message: '未知操作'
      }
  }
}

// 创建房间
async function createRoom(data) {
  const { roomData } = data
  
  try {
    const result = await roomsCollection.add({
      ...roomData,
      createTime: new Date()
    })
    
    return {
      success: true,
      roomId: result.id
    }
  } catch (error) {
    return {
      success: false,
      message: '创建房间失败',
      error: error.message
    }
  }
}

// 加入房间
async function joinRoom(data) {
  const { roomId, password, player, mode } = data
  
  try {
    // 检查房间是否存在
    const roomResult = await roomsCollection.doc(roomId).get()
    
    if (!roomResult.data || roomResult.data.length === 0) {
      return {
        success: false,
        message: '房间不存在'
      }
    }
    
    const room = roomResult.data[0]
    
    // 如果是观战或查看回放模式，不需要密码验证
    if (mode === 'spectate' || mode === 'replay') {
      return {
        success: true,
        role: 'spectator',
        roomInfo: room
      }
    }
    
    // 其他情况需要验证密码
    if (room.password !== password) {
      return {
        success: false,
        message: '房间密码错误'
      }
    }
    
    // 如果房间状态为等待中，则加入为白棋玩家
    if (room.gameStatus === 'waiting') {
      // 创建白棋玩家数据
      const whitePlayerData = {
        id: typeof player === 'object' ? player.id : 'white-' + Date.now(),
        name: typeof player === 'object' ? player.name : player
      };
      
      try {
        // 获取完整的房间数据并修改
        const roomData = { ...room };
        
        // 直接修改整个文档的相关字段
        roomData.whitePlayer = whitePlayerData;
        roomData.gameStatus = 'playing';
        roomData.updateTime = new Date();
        
        // 删除_id字段，避免MongoDB错误
        delete roomData._id;
        
        // 使用set方法完全替换文档
        await roomsCollection.doc(roomId).set(roomData);
        
        const updatedRoomResult = await roomsCollection.doc(roomId).get();
        const updatedRoom = updatedRoomResult.data[0];
        
        return {
          success: true,
          role: 'white',
          roomInfo: updatedRoom
        };
      } catch (updateError) {
        console.error('更新房间错误:', updateError);
        return {
          success: false,
          message: '加入房间时更新失败',
          error: updateError.message
        };
      }
    }
    
    // 否则作为观战者加入
    return {
      success: true,
      role: 'spectator',
      roomInfo: room
    }
  } catch (error) {
    console.error('加入房间错误详情:', error);
    return {
      success: false,
      message: '加入房间失败',
      error: error.message
    }
  }
}

// 更新房间信息
async function updateRoom(data) {
  const { roomId, updateData } = data
  
  try {
    await roomsCollection.doc(roomId).update({
      ...updateData,
      updateTime: new Date()
    })
    
    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      message: '更新房间失败',
      error: error.message
    }
  }
}

// 落子
async function placeStone(data) {
  const { roomId, row, col, player } = data
  
  try {
    // 获取当前房间信息
    const roomResult = await roomsCollection.doc(roomId).get()
    
    if (!roomResult.data || roomResult.data.length === 0) {
      return {
        success: false,
        message: '房间不存在'
      }
    }
    
    const room = roomResult.data[0]
    
    // 检查游戏是否在进行中
    if (room.gameStatus !== 'playing') {
      return {
        success: false,
        message: '游戏未开始或已结束'
      }
    }
    
    // 检查是否是当前玩家的回合
    if (room.currentTurn !== player) {
      return {
        success: false,
        message: '不是您的回合'
      }
    }
    
    // 检查该位置是否已有棋子
    if (room.board[row][col] !== null) {
      return {
        success: false,
        message: '该位置已有棋子'
      }
    }
    
    // 创建一个完整的房间数据副本
    const roomData = { ...room };
    
    // 更新棋盘 - 深拷贝避免引用问题
    roomData.board = JSON.parse(JSON.stringify(room.board));
    roomData.board[row][col] = player;
    
    // 检查是否获胜
    const isWin = checkWin(roomData.board, row, col, player);
    const isFull = checkBoardFull(roomData.board);
    
    // 更新房间状态
    roomData.lastMove = { row, col, player };
    roomData.currentTurn = player === 'black' ? 'white' : 'black';
    roomData.updateTime = new Date();
    
    if (isWin) {
      roomData.gameStatus = player === 'black' ? 'black_win' : 'white_win';
      roomData.winner = player;
    } else if (isFull) {
      roomData.gameStatus = 'draw';
    }
    
    // 如果游戏结束，更新排行榜
    if (isWin || isFull) {
      if (isWin) {
        // 更新获胜者和失败者的排行榜数据
        const winner = player === 'black' ? room.blackPlayer : room.whitePlayer;
        const loser = player === 'black' ? room.whitePlayer : room.blackPlayer;
        
        await updatePlayerRanking(winner, true);
        await updatePlayerRanking(loser, false);
      }
      // 如果是平局，两个玩家都算作失败
      if (isFull && !isWin) {
        await updatePlayerRanking(room.blackPlayer, false);
        await updatePlayerRanking(room.whitePlayer, false);
      }
    }
    
    // 删除_id字段，避免MongoDB错误
    delete roomData._id;
    
    try {
      // 使用set方法完全替换文档
      await roomsCollection.doc(roomId).set(roomData);
      
      return {
        success: true,
        isWin,
        isFull,
        gameStatus: roomData.gameStatus,
        nextTurn: roomData.currentTurn
      };
    } catch (updateError) {
      console.error('更新棋盘错误:', updateError);
      return {
        success: false,
        message: '落子时更新失败',
        error: updateError.message
      };
    }
  } catch (error) {
    console.error('落子错误:', error);
    return {
      success: false,
      message: '落子失败',
      error: error.message
    }
  }
}

// 获取房间信息
async function getRoomInfo(data) {
  const { roomId } = data
  
  try {
    const roomResult = await roomsCollection.doc(roomId).get()
    
    if (!roomResult.data || roomResult.data.length === 0) {
      return {
        success: false,
        message: '房间不存在'
      }
    }
    
    return {
      success: true,
      roomInfo: roomResult.data[0]
    }
  } catch (error) {
    return {
      success: false,
      message: '获取房间信息失败',
      error: error.message
    }
  }
}

// 重新开始游戏
async function restartGame(data) {
  const { roomId } = data
  
  try {
    // 初始化棋盘
    const board = Array(15).fill().map(() => Array(15).fill(null))
    
    await roomsCollection.doc(roomId).update({
      board,
      currentTurn: 'black',
      gameStatus: 'playing',
      lastMove: null,
      winner: null,
      updateTime: new Date()
    })
    
    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      message: '重新开始游戏失败',
      error: error.message
    }
  }
}

// 检查是否获胜
function checkWin(board, row, col, player) {
  // 检查方向: 水平、垂直、正对角线、反对角线
  const directions = [
    { x: 1, y: 0 }, // 水平
    { x: 0, y: 1 }, // 垂直
    { x: 1, y: 1 }, // 正对角线
    { x: 1, y: -1 } // 反对角线
  ]
  
  for (const dir of directions) {
    let count = 1 // 当前位置已经有一个棋子
    
    // 向一个方向查找
    for (let i = 1; i <= 4; i++) {
      const newRow = row + i * dir.y
      const newCol = col + i * dir.x
      
      if (
        newRow < 0 || newRow >= 15 ||
        newCol < 0 || newCol >= 15 ||
        board[newRow][newCol] !== player
      ) {
        break
      }
      
      count++
    }
    
    // 向相反方向查找
    for (let i = 1; i <= 4; i++) {
      const newRow = row - i * dir.y
      const newCol = col - i * dir.x
      
      if (
        newRow < 0 || newRow >= 15 ||
        newCol < 0 || newCol >= 15 ||
        board[newRow][newCol] !== player
      ) {
        break
      }
      
      count++
    }
    
    if (count >= 5) {
      return true
    }
  }
  
  return false
}

// 检查棋盘是否已满
function checkBoardFull(board) {
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if (board[row][col] === null) {
        return false
      }
    }
  }
  
  return true
}

// 更新玩家排行榜数据
async function updatePlayerRanking(player, isWinner) {
  if (!player || !player.id) {
    console.log('玩家信息不完整，跳过排行榜更新');
    return;
  }
  
  try {
    // 查询玩家排名记录
    const rankingResult = await rankingsCollection.where({
      playerId: player.id
    }).get();
    
    // 计算新的分数和胜负场次
    const point = isWinner ? 3 : -1;  // 赢得3分，输掉减1分
    
    // 如果排名记录存在，则更新
    if (rankingResult.data && rankingResult.data.length > 0) {
      const ranking = rankingResult.data[0];
      const newScore = Math.max(0, ranking.score + point);  // 确保分数不为负
      const newWinCount = (ranking.winCount || 0) + (isWinner ? 1 : 0);
      const newLoseCount = (ranking.loseCount || 0) + (isWinner ? 0 : 1);
      const totalGames = newWinCount + newLoseCount;
      const winRate = totalGames > 0 ? (newWinCount / totalGames * 100).toFixed(1) : 0;
      
      await rankingsCollection.doc(ranking._id).update({
        score: newScore,
        winCount: newWinCount,
        loseCount: newLoseCount,
        totalGames: totalGames,
        winRate: parseFloat(winRate), // 存储为数值更合适
        updateTime: new Date()
      });
    } else {
      // 否则创建新的排名记录
      const winCount = isWinner ? 1 : 0;
      const loseCount = isWinner ? 0 : 1;
      const totalGames = winCount + loseCount;
      const winRate = totalGames > 0 ? (winCount / totalGames * 100).toFixed(1) : 0;
      
      await rankingsCollection.add({
        playerId: player.id,
        playerName: player.name,
        score: isWinner ? 3 : 0,  // 首次赢得3分，输了就0分
        winCount: winCount,
        loseCount: loseCount,
        totalGames: totalGames,
        winRate: parseFloat(winRate),
        createTime: new Date(),
        updateTime: new Date()
      });
    }
  } catch (error) {
    console.error('更新排行榜失败:', error);
  }
}

// 获取排行榜
async function getRankings(data) {
  const { limit = 10 } = data
  
  try {
    // 按分数降序获取排行榜
    const rankingsResult = await rankingsCollection
      .orderBy('score', 'desc')
      .limit(limit)
      .get()
    
    // 对排行榜数据进行处理，确保有胜率字段和胜负场次
    const rankings = rankingsResult.data.map(player => {
      // 确保有winCount和loseCount字段
      player.winCount = player.winCount || 0;
      player.loseCount = player.loseCount || 0;
      
      // 确保计算正确的胜率，并转为字符串形式的小数
      const totalGames = player.winCount + player.loseCount;
      player.winRate = totalGames > 0 ? 
        parseFloat((player.winCount / totalGames * 100).toFixed(1)) : 0;
      
      return player;
    });
    
    return {
      success: true,
      rankings: rankings
    }
  } catch (error) {
    return {
      success: false,
      message: '获取排行榜失败',
      error: error.message
    }
  }
} 
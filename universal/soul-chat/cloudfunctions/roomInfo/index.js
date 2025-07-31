const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, roomId, userId } = event
  
  console.log('roomInfo云函数调用:', { action, roomId, userId })
  
  try {
    switch (action) {
      case 'exitRoom':
        return await exitRoom(roomId, userId)
      case 'getRoomStatus':
        return await getRoomStatus(roomId)
      default:
        return { code: -1, message: '不支持的操作' }
    }
  } catch (error) {
    console.error('roomInfo 云函数错误:', error)
    return { code: -1, message: error.message }
  }
}

// 用户退出房间
async function exitRoom(roomId, userId) {
  if (!roomId || !userId) {
    return { code: -1, message: '参数不完整' }
  }

  try {
    console.log('用户退出房间:', { roomId, userId })
    
    // 1. 获取房间信息
    const roomResult = await db.collection('chat_rooms').doc(roomId).get()
    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, message: '房间不存在' }
    }

    const room = roomResult.data[0]
    const participants = room.participants || []

    // 2. 检查用户是否在房间中
    if (!participants.includes(userId)) {
      return { code: -1, message: '用户不在此房间中' }
    }

    // 3. 更新房间状态
    const updateTime = new Date().getTime()
    
    // 标记房间为已关闭，记录退出用户和时间
    await db.collection('chat_rooms').doc(roomId).update({
      status: 'closed',
      closedBy: userId,
      closedAt: updateTime,
      lastActiveTime: updateTime
    })

    console.log('房间退出成功:', { roomId, closedAt: updateTime })

    return {
      code: 0,
      message: '退出房间成功',
      data: {
        roomId,
        closedAt: updateTime,
        remainingParticipants: participants.filter(id => id !== userId)
      }
    }

  } catch (error) {
    console.error('退出房间失败:', error)
    return { code: -1, message: '退出房间失败: ' + error.message }
  }
}

// 获取房间状态
async function getRoomStatus(roomId) {
  try {
    const result = await db.collection('chat_rooms').doc(roomId).get()
    if (!result.data || result.data.length === 0) {
      return { code: -1, message: '房间不存在' }
    }

    return {
      code: 0,
      data: result.data[0]
    }
  } catch (error) {
    return { code: -1, message: '获取房间状态失败: ' + error.message }
  }
}

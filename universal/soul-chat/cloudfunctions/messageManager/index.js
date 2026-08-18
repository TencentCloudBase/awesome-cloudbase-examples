const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, roomId, message, uid, limit, offset } = event
  
  console.log('messageManager云函数调用:', { action, roomId, uid })
  
  try {
    switch (action) {
      case 'send':
        return await sendMessage(roomId, message, uid)
      case 'getHistory':
        return await getMessageHistory(roomId, limit, offset)
      case 'markRead':
        return await markMessagesAsRead(roomId, uid)
      default:
        return {
          code: -1,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('messageManager 云函数错误:', error)
    return {
      code: -1,
      message: error.message || '服务器内部错误'
    }
  }
}

// 发送消息
async function sendMessage(roomId, message, senderUid) {
  console.log('(云函数)发送消息:', { roomId, message, senderUid })
  if (!roomId || !message || !senderUid) {
    return {
      code: -1,
      message: '参数不完整'
    }
  }
  
  try {
    console.log('发送消息:', { roomId, message, senderUid })
    
    // 验证聊天房间是否存在且用户有权限
    const roomResult = await db.collection('chat_rooms').where({
      _id: roomId,
      participants: _.in([senderUid])
    }).get()
    
    if (roomResult.data.length === 0) {
      return {
        code: -1,
        message: '聊天房间不存在或无权限'
      }
    }
    
    // 创建消息对象
    const newMessage = {
      roomId: roomId,
      senderId: senderUid,
      content: message.content,
      type: message.type || 'text',
      sendTime: new Date().getTime(), // 使用时间戳格式
      status: 'sent',
      readBy: [senderUid] // 发送者自动标记为已读
    }
    console.log('消息发送newMessage:', newMessage)
    // 保存消息到数据库
    const messageResult = await db.collection('messages').add(newMessage)
    
    // 更新聊天房间的最后消息时间
    await db.collection('chat_rooms').doc(roomId).update({
      lastMessageTime: new Date().getTime(), // 使用时间戳格式
      lastMessage: {
        content: message.content,
        senderId: senderUid,
        sendTime: new Date().getTime() // 使用时间戳格式
      }
    })
    
    console.log('消息发送成功:', messageResult)
    
    return {
      code: 0,
      message: '发送成功',
      data: {
        ...newMessage,
        _id: messageResult.id
      }
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    return {
      code: -1,
      message: '发送消息失败: ' + error.message
    }
  }
}

// 获取消息历史
async function getMessageHistory(roomId, limit = 20, offset = 0) {
  if (!roomId) {
    return {
      code: -1,
      message: '房间ID不能为空'
    }
  }
  
  try {
    console.log('获取消息历史:', { roomId, limit, offset })
    
    const result = await db.collection('messages')
      .where({
        roomId: roomId
      })
      .orderBy('sendTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get()
    
    // 按时间正序排列（最早的在前面）
    const messages = result.data.reverse()
    console.log("数据库读取出来的message",messages)
    return {
      code: 0,
      message: '获取成功',
      data: {
        messages: messages,
        total: result.total,
        hasMore: offset + limit < result.total
      }
    }
  } catch (error) {
    console.error('获取消息历史失败:', error)
    return {
      code: -1,
      message: '获取消息历史失败: ' + error.message
    }
  }
}

// 标记消息为已读
async function markMessagesAsRead(roomId, uid) {
  if (!roomId || !uid) {
    return {
      code: -1,
      message: '参数不完整'
    }
  }
  
  try {
    console.log('标记消息已读:', { roomId, uid })
    
    // 更新所有未读消息为已读
    const result = await db.collection('messages')
      .where({
        roomId: roomId,
        readBy: _.nin([uid])
      })
      .update({
        readBy: _.push(uid)
      })
    
    console.log('标记已读成功，更新条数:', result.updated)
    
    return {
      code: 0,
      message: '标记已读成功',
      data: {
        updatedCount: result.updated
      }
    }
  } catch (error) {
    console.error('标记已读失败:', error)
    return {
      code: -1,
      message: '标记已读失败: ' + error.message
    }
  }
} 
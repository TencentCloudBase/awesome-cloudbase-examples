const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, uid } = event
  
  // 验证用户身份
  if (!uid) {
    return {
      code: -1,
      message: '用户身份验证失败，请重新登录',
      data: null
    }
  }
  
  console.log('用户匹配函数调用:', { action, uid })
  
  try {
    switch (action) {
      case 'join':
        return await joinMatchQueue(uid, event)
      case 'cancel':
        return await cancelMatch(uid)
      case 'check':
        return await checkMatchStatus(uid)
      default:
        return {
          code: -1,
          message: '无效的操作类型',
          data: null
        }
    }
  } catch (error) {
    console.error('用户匹配函数执行错误:', error)
    return {
      code: -1,
      message: error.message || '服务器内部错误',
      data: null
    }
  }
}

// 加入匹配队列
async function joinMatchQueue(uid, event) {
  const { userInfo } = event
  
  console.log('用户加入匹配队列:', { uid, userInfo })
  
  try {
    // 1. 检查用户是否已经在队列中
    const existingQueue = await db.collection('match_queue')
      .where({
        uid: uid,
        status: 'waiting'
      })
      .get()
    
    if (existingQueue.data.length > 0) {
      return {
        code: 1,
        message: '您已经在匹配队列中',
        data: {
          status: 'waiting',
          queueId: existingQueue.data[0]._id
        }
      }
    }
    
    // 2. 查找等待中的其他用户
    const waitingUsers = await db.collection('match_queue')
      .where({
        uid: _.neq(uid),
        status: 'waiting',
        createTime: _.gte(new Date(Date.now() - 30000)) // 30秒内的队列记录
      })
      .orderBy('createTime', 'asc')
      .limit(1)
      .get()
    
    if (waitingUsers.data.length > 0) {
      // 找到匹配用户，创建聊天房间
      const matchedUser = waitingUsers.data[0]
      const roomId = await createChatRoom(uid, matchedUser.uid)
      
      // 更新两个用户的匹配状态
      const matchTime = new Date()
      
      await Promise.all([
        db.collection('match_queue').doc(matchedUser._id).update({
          status: 'matched',
          matchedWith: uid,
          roomId: roomId,
          matchTime: matchTime // 添加匹配成功时间
        }),
        db.collection('match_queue').add({
          uid: uid,
          status: 'matched',
          createTime: matchTime, // 使用统一的匹配时间
          matchTime: matchTime,
          matchedWith: matchedUser.uid,
          roomId: roomId,
          userInfo: userInfo
        })
      ])
      
      console.log('匹配成功:', { user1: uid, user2: matchedUser.uid, roomId })
      
      return {
        code: 0,
        message: '匹配成功',
        data: {
          status: 'matched',
          roomId: roomId,
          matchedWith: matchedUser.uid
        }
      }
    } else {
      // 没有找到匹配用户，加入等待队列
      const queueResult = await db.collection('match_queue').add({
        uid: uid,
        userInfo: userInfo,
        status: 'waiting',
        createTime: new Date()
      })
      
      console.log('加入等待队列:', { uid, queueId: queueResult.id })
      
      return {
        code: 0,
        message: '已加入匹配队列',
        data: {
          status: 'waiting',
          queueId: queueResult.id
        }
      }
    }
  } catch (error) {
    console.error('加入匹配队列失败:', error)
    throw new Error('加入匹配队列失败: ' + error.message)
  }
}

// 取消匹配
async function cancelMatch(uid) {
  console.log('用户取消匹配:', { uid })
  
  try {
    // 删除用户的匹配队列记录
    await db.collection('match_queue')
      .where({
        uid: uid,
        status: _.in(['waiting', 'matched'])
      })
      .remove()
    
    console.log('取消匹配成功:', { uid })
    
    return {
      code: 0,
      message: '已取消匹配',
      data: {
        status: 'cancelled'
      }
    }
  } catch (error) {
    console.error('取消匹配失败:', error)
    throw new Error('取消匹配失败: ' + error.message)
  }
}

// 检查匹配状态
async function checkMatchStatus(uid) {
  console.log('检查匹配状态:', { uid })
  
  try {
    const queueResult = await db.collection('match_queue')
      .where({
        uid: uid,
        status: _.in(['waiting', 'matched'])
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    
    if (queueResult.data.length === 0) {
      return {
        code: 0,
        message: '未在匹配队列中',
        data: {
          status: 'idle'
        }
      }
    }
    
    const queueItem = queueResult.data[0]
    
    // 检查是否超时（30秒）
    const now = new Date()
    const createTime = new Date(queueItem.createTime)
    const elapsed = (now.getTime() - createTime.getTime()) / 1000
    
    if (elapsed > 30 && queueItem.status === 'waiting') {
      // 超时，更新状态
      await db.collection('match_queue').doc(queueItem._id).update({
        status: 'timeout'
      })
      
      return {
        code: 0,
        message: '匹配超时',
        data: {
          status: 'timeout'
        }
      }
    }
    
    console.log('匹配状态检查结果:', queueItem)
    
    return {
      code: 0,
      message: '状态查询成功',
      data: {
        status: queueItem.status,
        roomId: queueItem.roomId,
        matchedWith: queueItem.matchedWith,
        elapsed: Math.floor(elapsed)
      }
    }
  } catch (error) {
    console.error('检查匹配状态失败:', error)
    throw new Error('检查匹配状态失败: ' + error.message)
  }
}



// 创建聊天房间
async function createChatRoom(user1, user2) {
  const roomData = {
    participants: [user1, user2],
    status: 'active',
    createTime: new Date(),
    lastMessageTime: new Date()
  }
  
  try {
    const roomResult = await db.collection('chat_rooms').add(roomData)
    
    console.log('聊天房间创建成功:', { roomId: roomResult.id, participants: [user1, user2] })
    
    return roomResult.id
  } catch (error) {
    console.error('创建聊天房间失败:', error)
    throw error
  }
}

 
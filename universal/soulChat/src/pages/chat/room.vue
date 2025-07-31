<template>
  <view class="chat-room">
    <!-- 聊天头部 -->
    <view class="chat-header">
      <button class="back-btn" @click="showExitConfirm">
        <text class="back-icon">←</text>
      </button>
      <view class="chat-info">
        <text class="partner-name">{{ partnerInfo.nickname || '神秘聊友' }}</text>
        <text class="online-status">{{ connectionStatus }}</text>
      </view>
      <button class="menu-btn" @click="showExitConfirm">
        <text class="menu-icon">⋯</text>
      </button>
    </view>

    <!-- 消息列表 -->
    <scroll-view 
      class="message-list" 
      scroll-y 
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <view class="message-container">
        <!-- 系统消息 -->
        <view class="system-message">
          <text class="system-text">🎉 匹配成功！开始愉快的聊天吧</text>
        </view>

        <!-- 聊天消息 -->
        <view 
          v-for="message in messages" 
          :key="message.id"
          class="message-wrapper"
          :class="[message.senderId === currentUserId ? 'my-message' : 'other-message']"
        >
          <view class="message-bubble">
            <text class="message-text">{{ message.content }}</text>
            <view class="message-meta">
              <text class="message-time">{{ formatMessageTime(message.sendTime) }}</text>
              <text 
                v-if="message.senderId === currentUserId" 
                class="message-status"
                :class="[`status-${message.status}`]"
              >
                {{ getStatusText(message.status) }}
              </text>
            </view>
          </view>
        </view>

        <!-- 对方离开提示 -->
        <view v-if="roomClosed" class="system-message">
          <text class="system-text">😔 对方已离开聊天</text>
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area" v-if="!roomClosed">
      <view class="input-container">
        <input 
          v-model="inputText"
          class="message-input"
          type="text"
          placeholder="输入消息..."
          :disabled="sendingMessage"
          @confirm="sendMessage"
          confirm-type="send"
          maxlength="500"
        />
        <button 
          class="send-btn" 
          :class="[canSend ? 'can-send' : 'cannot-send']"
          :disabled="!canSend || sendingMessage"
          @click="sendMessage"
        >
          <text class="send-text">{{ sendingMessage ? '发送中' : '发送' }}</text>
        </button>
      </view>
    </view>

    <!-- 确认退出对话框 -->
    <view v-if="showExitDialog" class="exit-dialog-overlay" @click="hideExitConfirm">
      <view class="exit-dialog" @click.stop>
        <text class="dialog-title">确认退出聊天？</text>
        <text class="dialog-desc">退出后将无法恢复当前聊天记录</text>
        <view class="dialog-actions">
          <button class="dialog-btn cancel-btn" @click="hideExitConfirm">
            <text>取消</text>
          </button>
          <button class="dialog-btn confirm-btn" @click="confirmExit">
            <text>退出</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { navigateTo, showToast, formatDate, parseQueryString } from '@/utils/index'
import { auth, app } from '@/utils/cloudbase'

// 页面参数
let roomId = ''
const currentUserId = ref('')
const partnerInfo = ref<any>({})

// 聊天状态
const roomClosed = ref(false)
const connectionStatus = ref('连接中...')
const messages = ref<any[]>([])
const inputText = ref('')
const sendingMessage = ref(false)
const scrollTop = ref(0)

// 对话框状态
const showExitDialog = ref(false)

// 消息监听器
let messageWatcher: any = null
// 房间状态监听器
let roomWatcher: any = null

// 防重复发送
let lastSendTime = 0

// 计算属性
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !roomClosed.value
})

// 获取页面参数
const getPageParams = (options: any) => {
  // 获取页面参数
  // const pages = getCurrentPages()
  // const currentPage = pages[pages.length - 1] as any
  // const options = currentPage.options || {}
  // console.log('获取当前页面:', currentPage)
  console.log('获取页面参数:', options)
  
  roomId = options.roomId || ''
  console.log('房间ID:', roomId)
}

// 初始化聊天室
const initChatRoom = async () => {
  try {
    // 获取当前用户信息
    const loginState = await auth.getLoginState()
    if (loginState) {
      currentUserId.value = loginState.user?.uid || ''
    } else {
      showToast('请先登录', 'error')
      navigateTo('/pages/login/phone-login', 'redirectTo')
      return
    }

    // 获取聊天伙伴信息
    await getPartnerInfo()

    connectionStatus.value = '在线'

    // 加载历史消息
    await loadMessages()

    // 启动实时消息监听
    startMessageWatcher()
    // 启动房间状态监听
    startRoomWatcher()
    console.log('开始监听聊天室消息和房间状态...')
    
  } catch (error) {
    console.error('初始化聊天室失败:', error)
    showToast('加载聊天室失败', 'error')
  }
}

// 获取聊天伙伴信息
const getPartnerInfo = async () => {
  try {
    if (!roomId) {
      console.error('roomId为空')
      partnerInfo.value = { nickname: '神秘聊友', avatar: '👤' }
      return
    }
    
    // 通过房间ID获取房间信息，找到聊天伙伴
    const db = app.database()
    const roomResult = await db.collection('chat_rooms')
      .where({
        _id: roomId
      })
      .get()
     
    if (roomResult.data && roomResult.data.length > 0) {
      const room = roomResult.data[0]
      const participants = room.participants || []
      console.log('当前用户ID详细信息:', currentUserId.value)
      
      // 找到对方的userId（不是当前用户的）
      const partnerUserId = participants.find((id: string) => {
        return id !== currentUserId.value
      })
      console.log('聊天伙伴ID:', partnerUserId)
      
      if (partnerUserId) {
        // 获取对方的用户信息
        // console.log('准备查询用户信息:', partnerUserId)
        const userResult = await db.collection('users')
          .where({
            uid: partnerUserId
          })
          .get()
        
        // console.log('获取用户信息结果:', userResult)
        
        if (userResult.data.length > 0) {
          const partner = userResult.data[0]
          partnerInfo.value = {
            userId: partner.uid,
            nickname: partner.nickname || '神秘聊友',
            avatar: partner.avatar || '👤'
          }
          // console.log('获取聊天伙伴信息成功:', partnerInfo.value)
        } else {
          console.error('未找到聊天伙伴用户信息')
          partnerInfo.value = {
            nickname: '神秘聊友',
            avatar: '👤'
          }
        }
      } else {
        console.error('未找到聊天伙伴ID')
        partnerInfo.value = {
          nickname: '神秘聊友', 
          avatar: '👤'
        }
      }
    } else {
      console.error('未找到聊天房间信息')
      partnerInfo.value = {
        nickname: '神秘聊友',
        avatar: '👤'
      }
    }
  } catch (error: any) {
    console.error('获取聊天伙伴信息失败:', error)
    partnerInfo.value = {
      nickname: '神秘聊友',
      avatar: '👤'
    }
  }
}

// 加载消息
const loadMessages = async () => {
  try {
    
    const result = await app.callFunction({
      name: 'messageManager',
      data: {
        action: 'getHistory',
        roomId: roomId,
        limit: 50
      }
    })
    
    // console.log('获取历史消息结果:', result)
    
    if (result.result.code === 0) {
      messages.value = result.result.data.messages || []
      
      // 标记消息为已读
      if (messages.value.length > 0) {
        await markMessagesAsRead()
      }
    } else {
      console.error('获取历史消息失败:', result.result.message)
      messages.value = []
    }
    
    // 滚动到底部
    scrollToBottom()
  } catch (error) {
    console.error('加载消息失败:', error)
    messages.value = []
  }
}

// 发送消息
const sendMessage = async () => {
  if (!canSend.value || sendingMessage.value) return

  const messageText = inputText.value.trim()
  if (!messageText) return
  
  // 防重复发送：500ms内不允许重复发送相同内容
  const now = Date.now()
  if (now - lastSendTime < 500) {
    console.log('发送太频繁，忽略重复请求')
    return
  }
  lastSendTime = now

  try {
    sendingMessage.value = true
    
    // 立即清空输入框，防止重复发送
    inputText.value = ''

    // 创建消息对象
    const newMessage = {
      id: Date.now().toString(),
      roomId: roomId,
      senderId: currentUserId.value,
      content: messageText,
      type: 'text',
      sendTime: new Date().getTime(),
      status: 'sending'
    }

    // 添加到消息列表 - 使用响应式更新
    messages.value = [...messages.value, newMessage]

    // 滚动到底部
    scrollToBottom()

    // 调用云函数发送消息
    console.log('发送消息:', newMessage)
    
    const result = await app.callFunction({
      name: 'messageManager',
      data: {
        action: 'send',
        roomId: roomId,
        uid: currentUserId.value,
        message: {
          content: messageText,
          type: 'text'
        }
      }
    })
    
    console.log('发送消息结果:', result)
    
    if (result.result.code === 0) {
      // 发送成功，更新消息状态
      const messageIndex = messages.value.findIndex(msg => msg.id === newMessage.id)
      if (messageIndex !== -1) {
        messages.value[messageIndex].status = 'sent'
        ;(messages.value[messageIndex] as any)._id = result.result.data._id
        // 强制触发Vue响应式更新
        messages.value = [...messages.value]
      }
    } else {
      // 发送失败
      const messageIndex = messages.value.findIndex(msg => msg.id === newMessage.id)
      if (messageIndex !== -1) {
        messages.value[messageIndex].status = 'failed'
        // 强制触发Vue响应式更新
        messages.value = [...messages.value]
      }
      showToast(result.result.message || '发送失败', 'error')
    }
    
    sendingMessage.value = false

  } catch (error) {
    console.error('发送消息失败:', error)
    showToast('发送失败', 'error')
    sendingMessage.value = false

    // 更新消息状态为失败
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage) {
      lastMessage.status = 'failed'
      // 强制触发Vue响应式更新
      messages.value = [...messages.value]
    }
  }
}

// 标记消息为已读
const markMessagesAsRead = async () => {
  try {
    await app.callFunction({
      name: 'messageManager',
      data: {
        action: 'markRead',
        roomId: roomId,
        uid: currentUserId.value
      }
    })
  } catch (error) {
    console.error('标记消息已读失败:', error)
  }
}

// 启动消息监听
const startMessageWatcher = () => {
  console.log('启动消息监听, roomId:', roomId)
  
  try {
    const db = app.database()
    
    messageWatcher = db.collection('messages')
      .where({
        roomId: roomId
      })
      .orderBy('sendTime', 'asc')
      .watch({
        onChange: (snapshot: any) => {
          console.log('收到消息变化:', snapshot)
            
          // 处理文档变化，而不是所有文档
          if (snapshot.docChanges && snapshot.docChanges.length > 0) {
            snapshot.docChanges.forEach((change: any) => {
              console.log('文档变化类型:', change.queueType, change.doc)
              
              // 只处理新增的消息
              if (change.queueType === 'enqueue') {
                const newMessage = change.doc
                
                // 检查消息是否已存在（通过_id或临时id）
                const existingMessage = messages.value.find(msg => 
                  (msg as any)._id === newMessage._id || 
                  (msg.senderId === newMessage.senderId && 
                   msg.content === newMessage.content && 
                   Math.abs(msg.sendTime - newMessage.sendTime) < 1000) // 1秒内的相同内容消息
                )
                
                if (!existingMessage) {
                  console.log('添加新消息到列表:', newMessage)
                  const messageObj = {
                    id: newMessage._id,
                    roomId: newMessage.roomId,
                    senderId: newMessage.senderId,
                    content: newMessage.content,
                    type: newMessage.type,
                    sendTime: newMessage.sendTime,
                    status: newMessage.status
                  }
                  // console.log('messageObj:', messageObj)
                  // 使用响应式的方式添加消息
                  messages.value = [...messages.value, messageObj]
                  // console.log("最后一条数据", messages.value[messages.value.length - 1])
                  // 滚动到底部
                  scrollToBottom()
                  
                  // 如果不是自己发送的消息，标记为已读
                  if (newMessage.senderId !== currentUserId.value) {
                    markMessagesAsRead()
                  }
                } else if (existingMessage.senderId === currentUserId.value) {
                  // 如果是自己发送的消息，更新状态和_id
                  const messageIndex = messages.value.findIndex(msg => 
                    msg.senderId === newMessage.senderId && 
                    msg.content === newMessage.content && 
                    Math.abs(msg.sendTime - newMessage.sendTime) < 1000
                  )
                  if (messageIndex !== -1) {
                    messages.value[messageIndex].status = 'sent'
                    ;(messages.value[messageIndex] as any)._id = newMessage._id
                    messages.value = [...messages.value] // 触发响应式更新
                  }
                }
              }
            })
          }
        },
        onError: (error) => {
          console.error('消息监听失败:', error)
        }
      })
  } catch (error) {
    console.error('启动消息监听失败:', error)
  }
}

// 停止消息监听
const stopMessageWatcher = () => {
  if (messageWatcher) {
    messageWatcher.close()
    messageWatcher = null
    console.log('已停止消息监听')
  }
}

// 启动房间状态监听
const startRoomWatcher = () => {
  console.log('启动房间状态监听, roomId:', roomId)
  
  try {
    const db = app.database()
    
    roomWatcher = db.collection('chat_rooms')
      .doc(roomId)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs && snapshot.docs.length > 0) {
            const room = snapshot.docs[0]
            console.log('房间状态变化:', room)
            
            // 检查房间是否被关闭
            if (room.status === 'closed' && room.closedBy !== currentUserId.value) {
              handlePartnerLeft()
            }
          }
        },
        onError: (error) => {
          console.error('房间状态监听失败:', error)
        }
      })
  } catch (error) {
    console.error('启动房间状态监听失败:', error)
  }
}

// 停止房间状态监听
const stopRoomWatcher = () => {
  if (roomWatcher) {
    roomWatcher.close()
    roomWatcher = null
    console.log('已停止房间状态监听')
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  scrollTop.value = 9999999
}

// 格式化消息时间
const formatMessageTime = (time: number | Date) => {
  const now = new Date()
  const msgTime = typeof time === 'number' ? new Date(time) : new Date(time)
  const diffMinutes = Math.floor((now.getTime() - msgTime.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  
  return formatDate(msgTime, 'MM-DD HH:mm')
}

// 获取消息状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'sending': return '发送中'
    case 'sent': return '已发送'
    case 'failed': return '发送失败'
    default: return ''
  }
}

// 显示退出确认
const showExitConfirm = () => {
  showExitDialog.value = true
}

// 隐藏退出确认
const hideExitConfirm = () => {
  showExitDialog.value = false
}

// 确认退出
const confirmExit = () => {
  hideExitConfirm()
  exitChat()
}

// 退出聊天
const exitChat = async () => {
  try {
    // 停止消息监听
    stopMessageWatcher()
    // 停止房间状态监听
    stopRoomWatcher()
    
    // 调用云函数关闭房间
    console.log('退出聊天房间:', roomId)
    const result = await app.callFunction({
      name: 'roomInfo',
      data: {
        action: 'exitRoom',
        roomId: roomId,
        userId: currentUserId.value
      }
    })
    
    console.log('退出房间结果:', result)
    
    if (result.result.code === 0) {
      console.log('房间关闭成功:', result.result.data)
      showToast('已退出聊天', 'none')
    } else {
      console.warn('关闭房间警告:', result.result.message)
      showToast('已退出聊天', 'none') // 即使服务端失败也让用户退出
    }
    
    // 返回聊天主页
    navigateTo('/pages/chat/home', 'redirectTo')
    
  } catch (error) {
    console.error('退出聊天失败:', error)
    // 即使出错也要让用户能够退出
    showToast('已退出聊天', 'none')
    navigateTo('/pages/chat/home', 'redirectTo')
  }
}

// 处理对方离开
const handlePartnerLeft = () => {
  roomClosed.value = true
  connectionStatus.value = '已离线'
  showToast('对方已离开聊天', 'none')
}

onLoad((options) => {
  getPageParams(options)
  initChatRoom()
})

onUnmounted(() => {
  // 清理消息监听器
  stopMessageWatcher()
  // 清理房间状态监听器
  stopRoomWatcher()
  console.log('清理聊天室监听器')
})
</script>

<style scoped>
.chat-room {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  position: relative;
}

/* 聊天头部 */
.chat-header {
  background: #6c5ce7;
  padding: 60rpx 30rpx 20rpx;
  display: flex;
  align-items: center;
  color: white;
  position: fixed;
  top: 85rpx;
  left: 0;
  right: 0;
  z-index: 100;
  height: 140rpx;
  box-sizing: border-box;
}

.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  margin-right: 20rpx;
}

.back-btn::after {
  border: none;
}

.back-icon {
  color: white;
  font-size: 40rpx;
  font-weight: bold;
}

.chat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.partner-name {
  font-size: 32rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 4rpx;
}

.online-status {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
}

.menu-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
}

.menu-btn::after {
  border: none;
}

.menu-icon {
  color: white;
  font-size: 36rpx;
  font-weight: bold;
}

/* 消息列表 */
.message-list {
  flex: 1;
  padding: 20rpx;
  background: #f5f5f5;
  margin-top: 140rpx; /* 为固定头部留出空间 */
  margin-bottom: 120rpx; /* 为固定输入框留出空间 */
  box-sizing: border-box;
}

.message-container {
  padding-bottom: 40rpx;
}

.system-message {
  text-align: center;
  margin: 30rpx 0;
}

.system-text {
  background: rgba(0,0,0,0.1);
  color: #666;
  font-size: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  display: inline-block;
}

.message-wrapper {
  margin-bottom: 24rpx;
  display: flex;
}

.my-message {
  justify-content: flex-end;
}

.other-message {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 20rpx;
  border-radius: 20rpx;
  position: relative;
}

.my-message .message-bubble {
  background: #6c5ce7;
  color: white;
}

.other-message .message-bubble {
  background: white;
  color: #333;
  border: 1rpx solid #eee;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-meta {
  margin-top: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20rpx;
}

.my-message .message-meta {
  color: rgba(255,255,255,0.8);
}

.other-message .message-meta {
  color: #999;
}

.message-time {
  font-size: 20rpx;
}

.message-status {
  font-size: 20rpx;
}

.status-sending {
  color: rgba(255,255,255,0.6);
}

.status-sent {
  color: rgba(255,255,255,0.8);
}

.status-failed {
  color: #ff4757;
}

/* 输入区域 */
.input-area {
  background: white;
  padding: 20rpx;
  border-top: 1rpx solid #eee;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
}

.input-container {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 25rpx;
  padding: 8rpx 8rpx 8rpx 20rpx;
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 28rpx;
  color: #333;
  min-height: 60rpx;
  line-height: 60rpx;
}

.send-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 20rpx;
  padding: 12rpx 24rpx;
  margin-left: 12rpx;
  min-width: 120rpx;
}

.send-btn.cannot-send {
  background: #ccc;
}

.send-btn::after {
  border: none;
}

.send-text {
  font-size: 26rpx;
  font-weight: 500;
}

/* 退出对话框 */
.exit-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.exit-dialog {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin: 40rpx;
  max-width: 500rpx;
}

.dialog-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
  text-align: center;
}

.dialog-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 40rpx;
  display: block;
}

.dialog-actions {
  display: flex;
  gap: 20rpx;
}

.dialog-btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.dialog-btn::after {
  border: none;
}

.cancel-btn {
  background: #f8f9fa;
  color: #666;
}

.confirm-btn {
  background: #ff4757;
  color: white;
}
</style> 
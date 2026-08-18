<template>
  <view class="chat-home">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="avatar">
        <text class="avatar-text">{{ avatarText }}</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickname || '匿名用户' }}</text>
        <text class="status" :class="[`status-${userStatus}`]">{{ statusText }}</text>
      </view>
      <button class="profile-btn" @click="goToProfile">
        <text class="profile-icon">⚙️</text>
      </button>
    </view>

    <!-- 主要内容区 -->
    <view class="main-section">
      <!-- 匹配状态显示 -->
      <view class="match-status" v-if="matchStatus !== 'idle'">
        <view class="status-animation" :class="[`animation-${matchStatus}`]">
          <text class="animation-icon">{{ statusIcon }}</text>
        </view>
        <text class="status-text">{{ statusMessage }}</text>
        <view v-if="matchStatus === 'matching'" class="match-timer">
          <text class="timer-text">{{ formatTime(matchTimer) }}</text>
        </view>
      </view>

      <!-- 匹配按钮区 -->
      <view class="match-section" v-if="matchStatus === 'idle'">
        <view class="match-intro">
          <text class="intro-title">准备好开始聊天了吗？</text>
          <text class="intro-desc">点击下方按钮，随机匹配一位在线用户</text>
        </view>
        
        <button class="match-btn" @click="startMatching">
          <text class="match-btn-text">🎯 开始匹配</text>
        </button>
      </view>

      <!-- 取消匹配按钮 -->
      <view class="cancel-section" v-if="matchStatus === 'matching'">
        <button class="cancel-btn" @click="cancelMatching">
          <text class="cancel-btn-text">取消匹配</text>
        </button>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="tips">
      <text class="tips-text">💡 聊天完全匿名，请文明交流</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { navigateTo, showToast, showLoading, hideLoading } from '@/utils/index'
import { auth, app } from '@/utils/cloudbase'

// 用户信息
const userInfo = ref<any>({})
const userStatus = ref<'online' | 'matching' | 'chatting'>('online')

// 匹配状态
const matchStatus = ref<'idle' | 'matching' | 'matched' | 'failed'>('idle')
const matchTimer = ref(0)
let matchInterval: any = null
let matchTimeout: any = null
let matchWatcher: any = null
const queueId = ref('')

// 计算属性
const avatarText = computed(() => {
  const nickname = userInfo.value.nickname || '匿名用户'
  return nickname.charAt(0).toUpperCase()
})

const statusText = computed(() => {
  switch (userStatus.value) {
    case 'online': return '在线'
    case 'matching': return '匹配中'
    case 'chatting': return '聊天中'
    default: return '离线'
  }
})

const statusIcon = computed(() => {
  switch (matchStatus.value) {
    case 'matching': return '🔍'
    case 'matched': return '🎉'
    case 'failed': return '😔'
    default: return '💬'
  }
})

const statusMessage = computed(() => {
  switch (matchStatus.value) {
    case 'matching': return '正在为你寻找聊天伙伴...'
    case 'matched': return '匹配成功！即将进入聊天室'
    case 'failed': return '匹配失败，请稍后重试'
    default: return ''
  }
})

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 获取用户信息
const getUserInfo = async () => {
  try {
    const loginState = await auth.getLoginState()
    if (loginState) {
      const authUser = loginState.user || {}
      console.log('用户信息:', authUser)
      
      // 从数据库获取完整的用户信息
      const result = await app.callFunction({
        name: 'userProfile',
        data: {
          action: 'get',
          uid: authUser.uid
        }
      })
      
      console.log('获取用户信息结果:', result)
      
      if (result.result.code === 0) {
        // 用户已存在，使用数据库中的信息
        userInfo.value = {
          ...authUser,
          ...result.result.data
        }
            } else if (result.result.code === 1) {
        // 用户不存在，创建新用户
        console.log('用户不存在，准备创建新用户:', authUser)
        
        const createResult = await app.callFunction({
          name: 'userProfile',
          data: {
            action: 'create',
            uid: authUser.uid,
            authUserInfo: {
              phone: (authUser as any).phone || '',
              customUserId: (authUser as any).customUserId || '',
              loginType: (authUser as any).loginType || 'phone',
              avatar: (authUser as any).avatar || ''
            }
          }
        })
        
        console.log('创建用户信息结果:', createResult)
        
        if (createResult.result && createResult.result.code === 0) {
          userInfo.value = {
            ...authUser,
            ...createResult.result.data
          }
          showToast('欢迎使用SoulChat！已为您生成专属昵称', 'success')
        } else {
          console.error('创建用户失败，详细信息:', createResult)
          throw new Error(createResult.result?.message || '创建用户信息失败')
        }
      } else {
        throw new Error(result.result.message || '获取用户信息失败')
      }
    } else {
      // 未登录，跳转到登录页
      showToast('请先登录', 'error')
      setTimeout(() => {
        navigateTo('/pages/login/phone-login', 'redirectTo')
      }, 1500)
    }
  } catch (error: any) {
    console.error('获取用户信息失败:', error)
    showToast(error.message || '获取用户信息失败', 'error')
  }
}

// 开始匹配
const startMatching = async () => {
  try {
    showLoading('开始匹配...')
    
    matchStatus.value = 'matching'
    userStatus.value = 'matching'
    matchTimer.value = 0
    
    // 启动计时器
    matchInterval = setInterval(() => {
      matchTimer.value++
    }, 1000)
    
    // 调用云函数加入匹配队列
    const result = await app.callFunction({
      name: 'userMatch',
      data: {
        action: 'join',
        uid: userInfo.value.uid,
        userInfo: {
          nickname: userInfo.value.nickname,
          avatar: userInfo.value.avatar
        }
      }
    })
    
    hideLoading()
    
    console.log('匹配云函数返回:', result)
    
    if (result.result.code === 0) {
      const data = result.result.data
      
      if (data.status === 'matched') {
        // 立即匹配成功
        matchSuccess(data.roomId)
      } else if (data.status === 'waiting') {
        // 进入等待队列，开始监听匹配结果
        queueId.value = data.queueId
        startMatchWatcher()
        
        // 30秒超时检查
        matchTimeout = setTimeout(() => {
          checkMatchTimeout()
        }, 30000)
      }
    } else {
      throw new Error(result.result.message || '加入匹配队列失败')
    }
    
  } catch (error: any) {
    console.error('开始匹配失败:', error)
    showToast(error.message || '开始匹配失败', 'error')
    matchStatus.value = 'idle'
    userStatus.value = 'online'
    hideLoading()
  }
}

// 取消匹配
const cancelMatching = async () => {
  try {
    clearMatchTimer()
    
    // 调用云函数取消匹配
    await app.callFunction({
      name: 'userMatch',
      data: {
        action: 'cancel',
        uid: userInfo.value.uid
      }
    })
    
    matchStatus.value = 'idle'
    userStatus.value = 'online'
    
    showToast('已取消匹配', 'none')
  } catch (error: any) {
    console.error('取消匹配失败:', error)
    showToast(error.message || '取消匹配失败', 'error')
  }
}

// 匹配成功
const matchSuccess = (roomId: string) => {
  clearMatchTimer()
  matchStatus.value = 'matched'
  userStatus.value = 'chatting'
  
  showToast('匹配成功！即将进入聊天室', 'success')
  
  console.log('匹配成功，准备进入聊天房间:', roomId)
  
  // 1.5秒后跳转到聊天房间
  setTimeout(() => {
    navigateTo(`/pages/chat/room?roomId=${roomId}`, 'redirectTo')
  }, 1500) 
}

// 匹配失败
const matchFailed = () => {
  clearMatchTimer()
  matchStatus.value = 'failed'
  userStatus.value = 'online'
  
  showToast('匹配超时，请稍后重试', 'error')
  
  // 3秒后重置状态
  setTimeout(() => {
    matchStatus.value = 'idle'
  }, 3000)
}

// 清理计时器
const clearMatchTimer = () => {
  if (matchInterval) {
    clearInterval(matchInterval)
    matchInterval = null
  }
  if (matchTimeout) {
    clearTimeout(matchTimeout)
    matchTimeout = null
  }
  if (matchWatcher) {
    matchWatcher.close()
    matchWatcher = null
  }
}

// 开始监听匹配结果 - 只监听waiting状态记录的变化
const startMatchWatcher = () => {
  const db = app.database()
  
  console.log('开始监听waiting状态记录变化:', userInfo.value.uid)
  
  // 只监听当前用户的waiting状态记录
  matchWatcher = db.collection('match_queue')
    .where({
      uid: userInfo.value.uid,
      status: 'waiting'
    })
    .watch({
      onChange: (snapshot) => {
        console.log('waiting记录变化:', snapshot)
        
        // 如果waiting记录消失了，说明状态变成了matched
        if (snapshot.docs.length === 0) {
          console.log('waiting记录消失，匹配成功')
          clearMatchTimer()
          checkMatchResult()
        }
      },
      onError: (error) => {
        console.error('监听waiting记录失败:', error)
      }
    })
}

// 检查匹配结果
const checkMatchResult = async () => {
  try {
    const result = await app.callFunction({
      name: 'userMatch',
      data: {
        action: 'check',
        uid: userInfo.value.uid
      }
    })
    
    console.log('检查匹配结果:', result)
    
    if (result.result.code === 0 && result.result.data.status === 'matched') {
      matchSuccess(result.result.data.roomId)
    }
  } catch (error) {
    console.error('检查匹配结果失败:', error)
  }
}

// 检查匹配超时
const checkMatchTimeout = async () => {
  try {
    const result = await app.callFunction({
      name: 'userMatch',
      data: {
        action: 'check',
        uid: userInfo.value.uid
      }
    })
    
    if (result.result.code === 0) {
      const data = result.result.data
      
      if (data.status === 'matched') {
        matchSuccess(data.roomId)
      } else if (data.status === 'timeout' || data.elapsed >= 30) {
        matchFailed()
      }
    } else {
      matchFailed()
    }
  } catch (error: any) {
    console.error('检查匹配状态失败:', error)
    matchFailed()
  }
}

// 前往个人信息页
const goToProfile = () => {
  navigateTo('/pages/profile/profile')
}

onMounted(() => {
  getUserInfo()
})

onUnmounted(() => {
  clearMatchTimer()
})
</script>

<style scoped>
.chat-home {
  height: 100vh;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  padding: 16rpx 32rpx; /* 调整内边距 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box; /* 包含内边距在内 */
}

/* 用户信息卡片 */
.user-card {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10rpx);
  border-radius: 24rpx;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  border: 1rpx solid rgba(255,255,255,0.2);
  flex-shrink: 0;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.avatar-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #6c5ce7;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.nickname {
  font-size: 32rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 8rpx;
}

.status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  align-self: flex-start;
}

.status-online {
  background: rgba(46, 204, 113, 0.8);
  color: white;
}

.status-matching {
  background: rgba(241, 196, 15, 0.8);
  color: white;
}

.status-chatting {
  background: rgba(231, 76, 60, 0.8);
  color: white;
}

.profile-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-btn::after {
  border: none;
}

.profile-icon {
  font-size: 30rpx;
}

/* 主要内容区 */
.main-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20rpx 0; /* 减少垂直padding */
  min-height: 0; /* 允许flex子项收缩 */
}

/* 匹配状态 */
.match-status {
  text-align: center;
  margin-bottom: 30rpx;
}

.status-animation {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
  background: rgba(255,255,255,0.2);
}

.animation-matching {
  animation: pulse 2s infinite;
}

.animation-matched {
  background: rgba(46, 204, 113, 0.3);
}

.animation-failed {
  background: rgba(231, 76, 60, 0.3);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.animation-icon {
  font-size: 50rpx;
}

.status-text {
  font-size: 32rpx;
  color: white;
  font-weight: 500;
  margin-bottom: 20rpx;
  display: block;
}

.match-timer {
  background: rgba(255,255,255,0.15);
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: inline-block;
}

.timer-text {
  font-size: 28rpx;
  color: white;
  font-weight: 600;
}

/* 匹配区域 */
.match-section {
  text-align: center;
  width: 100%;
}

.match-intro {
  margin-bottom: 50rpx;
}

.intro-title {
  font-size: 36rpx;
  font-weight: 600;
  color: white;
  display: block;
  margin-bottom: 20rpx;
}

.intro-desc {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
  line-height: 1.4;
}

.match-btn {
  background: white;
  border-radius: 50rpx;
  padding: 24rpx 60rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.2);
  transform: scale(1);
  transition: transform 0.2s;
}

.match-btn:active {
  transform: scale(0.95);
}

.match-btn::after {
  border: none;
}

.match-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #6c5ce7;
}

/* 取消匹配 */
.cancel-section {
  margin-top: 40rpx;
}

.cancel-btn {
  background: rgba(255,255,255,0.2);
  border: 2rpx solid rgba(255,255,255,0.3);
  border-radius: 50rpx;
  padding: 16rpx 32rpx;
  color: white;
}

.cancel-btn::after {
  border: none;
}

.cancel-btn-text {
  font-size: 28rpx;
  color: white;
}

/* 底部提示 */
.tips {
  text-align: center;
  /* margin-top: auto;
  padding-top: 40rpx; */
  padding: 16rpx 0; /* 减少垂直padding */
  flex-shrink: 0; /* 防止被压缩 */
}

.tips-text {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
  line-height: 1.4;
}
</style> 
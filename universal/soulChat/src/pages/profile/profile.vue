<template>
  <view class="profile-container">
    <view class="profile-header">
      <text class="title">用户信息</text>
    </view>
    
    <view class="profile-content">
      <view v-if="userInfo" class="user-info">
        <view class="info-item">
          <text class="label">用户ID:</text>
          <text class="value">{{ userInfo.uid || '未知' }}</text>
        </view>
        <!-- <view class="info-item">
          <text class="label">登录类型:</text>
          <text class="value">{{ getLoginType(userInfo) }}</text>
        </view> -->
        <view v-if="userInfo.phone_number" class="info-item">
          <text class="label">手机号:</text>
          <text class="value">{{ userInfo.phone_number }}</text>
        </view>
        <view v-if="userInfo.email" class="info-item">
          <text class="label">邮箱:</text>
          <text class="value">{{ userInfo.email }}</text>
        </view>
        <view class="info-item">
          <text class="label">用户名:</text>
          <text class="value">{{ getUserName(userInfo) }}</text>
        </view>
        <view class="info-item">
          <text class="label">创建时间:</text>
          <text class="value">{{ formatDate(userInfo.createTime) }}</text>
        </view>
        <view class="info-item">
          <text class="label">最后登录:</text>
          <text class="value">{{ formatDate(userInfo.lastLoginTime) }}</text>
        </view>
        
        <button class="logout-btn" @click="handleLogout">
          退出登录
        </button>
      </view>
      
      <view v-else class="no-user">
        <text class="no-user-text">未登录</text>
        <button class="login-btn" @click="goToLogin">
          去登录
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { app, logout, auth } from '../../utils/cloudbase'

const userInfo = ref<any>(null)

// 获取用户信息
const getUserInfo = async () => {
  try {
    // const auth = app.auth()
    const loginState = await auth.getLoginState()
    
    if (loginState && loginState.user) {
      userInfo.value = loginState.user
      console.log('用户登录状态loginState:', loginState)
      console.log('完整用户信息loginState.user:', loginState.user)
    } else {
      userInfo.value = null
      console.log('用户未登录')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    userInfo.value = null
  }
}

// 获取用户名
const getUserName = (user: any) => {
  if (!user) return '未知'
  
  // 优先显示用户设置的昵称
  if (user.nickName) return user.nickName
  if (user.username) return user.username
  
  // 如果有手机号，显示脱敏的手机号
  if (user.phone_number) {
    const phone = user.phone_number.replace(/^\+86\s?/, '') // 去掉+86前缀
    if (phone.length === 11) {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }
    return phone
  }
  
  // 如果有邮箱，显示脱敏的邮箱
  if (user.email) {
    const emailParts = user.email.split('@')
    if (emailParts.length === 2) {
      const username = emailParts[0]
      const domain = emailParts[1]
      if (username.length > 2) {
        return `${username.substring(0, 2)}***@${domain}`
      }
    }
    return user.email
  }
  
  // 匿名用户显示部分UID
  if (user.isAnonymous && user.uid) {
    return `匿名用户 (${user.uid.substring(0, 8)}...)`
  }
  
  return '未设置'
}

// 格式化日期
const formatDate = (timestamp: number) => {
  if (!timestamp) return '未知'
  
  try {
    // 处理不同的时间戳格式
    let date: Date
    
    // 如果是秒级时间戳，转换为毫秒
    if (timestamp.toString().length === 10) {
      date = new Date(timestamp * 1000)
    } else {
      date = new Date(timestamp)
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效日期'
    }
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    console.error('日期格式化失败:', error)
    return '格式错误'
  }
}

// 退出登录
const handleLogout = async () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await logout()
          userInfo.value = null
          uni.showToast({
            title: '已退出登录',
            icon: 'success'
          })
          uni.navigateTo({
            url: '/pages/index/index'
          })        
        } catch (error: any) {
          uni.showToast({
            title: error.message || '退出失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  })
}

onMounted(() => {
  getUserInfo()
})
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
}

.profile-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
}

.profile-content {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.1);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-of-type {
  border-bottom: none;
}

.label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.value {
  font-size: 32rpx;
  color: #333;
  word-break: break-all;
  line-height: 1.4;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  background: #ff4757;
  color: white;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 40rpx;
}

.logout-btn:active {
  background: #ff3838;
}

.no-user {
  text-align: center;
  padding: 60rpx 20rpx;
}

.no-user-text {
  font-size: 32rpx;
  color: #999;
  display: block;
  margin-bottom: 40rpx;
}

.login-btn {
  width: 200rpx;
  height: 88rpx;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: bold;
}

.login-btn:active {
  background: #5a6fd8;
}
</style>

<template>
  <view class="app-container">
    <!-- 品牌头部 -->
    <view class="header">
      <view class="logo-container">
        <text class="logo-icon">💬</text>
        <text class="app-name">SoulChat</text>
      </view>
      <text class="app-slogan">匿名聊天，真实交流</text>
    </view>

    <!-- 主内容区 -->
    <view class="main-content">
      <view class="welcome-section">
        <text class="welcome-title">开始你的匿名聊天之旅</text>
        <text class="welcome-desc">随机匹配，遇见有趣的灵魂</text>
      </view>

      <!-- 功能介绍 -->
      <view class="features">
        <view class="feature-item">
          <text class="feature-icon">🎯</text>
          <text class="feature-text">随机匹配在线用户</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">💫</text>
          <text class="feature-text">完全匿名安全聊天</text>
        </view>
        <view class="feature-item">
          <text class="feature-icon">⚡</text>
          <text class="feature-text">实时消息即刻送达</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <button 
          v-if="!isLoggedIn" 
          class="primary-btn" 
          @click="goToLogin"
          :loading="isLoading"
        >
          {{ isLoading ? '检查登录状态...' : '开始聊天' }}
        </button>
        
        <button 
          v-else 
          class="primary-btn" 
          @click="goToChat"
        >
          进入聊天
        </button>

        <view v-if="isLoggedIn" class="user-info">
          <text class="user-welcome">欢迎回来，{{ userInfo.nickname || '匿名用户' }}</text>
        </view>
      </view>
    </view>

    <!-- 底部信息 -->
    <view class="footer">
      <text class="footer-text">SoulChat · 让心灵自由交流</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo, showToast, showLoading, hideLoading } from '@/utils/index'
import { auth, checkEnvironment } from '@/utils/cloudbase'

const isLoggedIn = ref(false)
const isLoading = ref(true)
const userInfo = ref<any>({})

// 检查登录状态
const checkLoginStatus = async () => {
  try {
    showLoading('检查登录状态...')
    
    // 检查云开发环境配置
    if (!checkEnvironment()) {
      showToast('云开发环境未正确配置', 'error')
      return
    }

    // 获取登录状态
    const loginState = await auth.getLoginState()
    
    if (loginState) {
      isLoggedIn.value = true
      userInfo.value = loginState.user || {}
      console.log('用户已登录:', userInfo.value)
    } else {
      isLoggedIn.value = false
      console.log('用户未登录')
    }
  } catch (error) {
    console.error('检查登录状态失败:', error)
    showToast('检查登录状态失败', 'error')
    isLoggedIn.value = false
  } finally {
    isLoading.value = false
    hideLoading()
  }
}

// 前往登录页面
const goToLogin = () => {
  navigateTo('/pages/login/phone-login')
}

// 前往聊天主页
const goToChat = () => {
  navigateTo('/pages/chat/home')
}

onMounted(() => {
  checkLoginStatus()
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  display: flex;
  flex-direction: column;
  padding: 40rpx 60rpx;
  position: relative;
}

.header {
  text-align: center;
  margin-top: 120rpx;
  margin-bottom: 80rpx;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.logo-icon {
  font-size: 80rpx;
  margin-right: 20rpx;
}

.app-name {
  font-size: 64rpx;
  font-weight: bold;
  color: white;
  text-shadow: 0 4rpx 8rpx rgba(0,0,0,0.2);
}

.app-slogan {
  font-size: 32rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 300;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.welcome-section {
  text-align: center;
  margin-bottom: 80rpx;
}

.welcome-title {
  display: block;
  font-size: 44rpx;
  color: white;
  font-weight: 600;
  margin-bottom: 20rpx;
}

.welcome-desc {
  font-size: 30rpx;
  color: rgba(255,255,255,0.8);
}

.features {
  margin-bottom: 100rpx;
}

.feature-item {
  background: rgba(255,255,255,0.15);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  backdrop-filter: blur(10rpx);
  border: 1rpx solid rgba(255,255,255,0.2);
}

.feature-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.feature-text {
  font-size: 32rpx;
  color: white;
  font-weight: 500;
}

.action-section {
  text-align: center;
}

.primary-btn {
  background: white;
  color: #6c5ce7;
  border-radius: 50rpx;
  padding: 24rpx 80rpx;
  font-size: 36rpx;
  font-weight: 600;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.2);
  margin-bottom: 30rpx;
}

.primary-btn::after {
  border: none;
}

.user-info {
  margin-top: 20rpx;
}

.user-welcome {
  font-size: 28rpx;
  color: rgba(255,255,255,0.9);
}

.footer {
  text-align: center;
  margin-top: 60rpx;
}

.footer-text {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
}
</style>

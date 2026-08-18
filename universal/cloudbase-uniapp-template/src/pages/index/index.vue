<template>
  <view class="container">
    <view class="header">
      <text class="title">CloudBase UniApp 模板</text>
      <text class="subtitle">基于云开发的跨平台应用模板</text>
    </view>

    <view class="features">
      <view class="feature-card">
        <text class="feature-icon">🚀</text>
        <text class="feature-title">多端支持</text>
        <text class="feature-desc">一套代码，多端运行</text>
      </view>

      <view class="feature-card">
        <text class="feature-icon">⚡</text>
        <text class="feature-title">云开发集成</text>
        <text class="feature-desc">内置云函数、数据库、存储</text>
      </view>

      <view class="feature-card">
        <text class="feature-icon">🔧</text>
        <text class="feature-title">开箱即用</text>
        <text class="feature-desc">完整的开发工具链</text>
      </view>
    </view>

    <view class="actions">
      <button class="btn btn-primary" @click="goToDemo">
        体验云开发功能
      </button>
      <button class="btn btn-success" @click="goToLogin">
        选择登录方式
      </button>
      <button class="btn btn-info" @click="goToProfile">
        查看用户信息
      </button>
      <button class="btn btn-secondary" @click="openDocs">
        查看文档
      </button>
    </view>

    <view class="footer">
      <image class="logo" src="https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg" mode="widthFix" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 跳转到演示页面
const goToDemo = () => {
  uni.navigateTo({
    url: '/pages/demo/demo'
  })
}

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/index'
  });
}

// 跳转到用户信息页面
const goToProfile = () => {
  uni.navigateTo({
    url: '/pages/profile/profile'
  })
}

// 打开文档
const openDocs = () => {
  // #ifdef H5
  window.open('https://docs.cloudbase.net/', '_blank')
  // #endif

  // #ifndef H5
  uni.setClipboardData({
    data: 'https://docs.cloudbase.net/',
    success: () => {
      uni.showToast({
        title: '文档地址已复制',
        icon: 'success'
      })
    }
  })
  // #endif
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
  display: block;
  margin-bottom: 10rpx;
}

.subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 60rpx;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10rpx);
  border-radius: 20rpx;
  padding: 30rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
}

.feature-icon {
  font-size: 48rpx;
  display: block;
  margin-bottom: 15rpx;
}

.feature-title {
  font-size: 32rpx;
  font-weight: bold;
  color: white;
  display: block;
  margin-bottom: 10rpx;
}

.feature-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.btn {
  width: 100%;
  padding: 20rpx 30rpx;
  border-radius: 40rpx;
  border: none;
  font-size: 28rpx;
  font-weight: bold;
  text-align: center;
}

.btn-primary {
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  color: white;
  box-shadow: 0 8rpx 20rpx rgba(255, 107, 107, 0.3);
}

.btn-success {
  background: linear-gradient(45deg, #56ab2f, #a8e6cf);
  color: white;
  box-shadow: 0 8rpx 20rpx rgba(86, 171, 47, 0.3);
}

.btn-info {
  background: linear-gradient(45deg, #3498db, #74b9ff);
  color: white;
  box-shadow: 0 8rpx 20rpx rgba(52, 152, 219, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
}

.footer {
  margin-top: 60rpx;
  text-align: center;
}

.footer .logo {
  width: 300rpx;
  opacity: 0.8;
}
</style>

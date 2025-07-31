<template>
  <view class="login-container">
    <!-- 品牌头部 -->
    <view class="brand-header">
      <view class="logo-container">
        <text class="logo-icon">💬</text>
        <text class="app-name">SoulChat</text>
      </view>
      <text class="app-slogan">匿名聊天，真实交流</text>
    </view>

    <view class="login-header">
      <text class="title">欢迎加入</text>
      <text class="subtitle">请输入手机号开始你的匿名聊天之旅</text>
    </view>
    
    <view class="login-form">
      <!-- 手机号输入 -->
      <view class="input-group">
        <text class="label">手机号</text>
        <input 
          class="input-field"
          type="number"
          placeholder="请输入手机号"
          v-model="phoneNumber"
          maxlength="11"
        />
      </view>
      <show-captcha />
      <!-- 验证码输入 -->
      <view class="input-group">
        <text class="label">验证码</text>
        <view class="verification-row">
          <input 
            class="input-field verification-input"
            type="number"
            placeholder="请输入验证码"
            v-model="verificationCode"
            maxlength="6"
          />
          <button 
            class="get-code-btn"
            :disabled="!isPhoneValid || countdown > 0"
            @click="getVerificationCode"
          >
            {{ countdown > 0 ? `${countdown}s后重试` : '获取验证码' }}
          </button>
        </view>
      </view>
      
      <!-- 登录按钮 -->
      <button 
        class="login-btn"
        :disabled="!canLogin"
        @click="handleLogin"
      >
        登录
      </button>
      
      <!-- 返回链接 -->
      <view class="back-login">
        <text @click="goBack" class="link-text">返回登录方式选择</text>
      </view>
    </view>
  
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from 'vue'
import { getPhoneVerification, signInWithPhoneCode, ensureLogin } from '../../utils/cloudbase'

// 响应式数据
const phoneNumber = ref('')
const verificationCode = ref('')
const verificationInfo = ref<any>(null)
const countdown = ref(0)
const loading = ref(false)
const loadingText = ref('')

// 计时器
let timer: any = null

// 计算属性
const isPhoneValid = computed(() => {
  return /^1[3-9]\d{9}$/.test(phoneNumber.value)
})

const canLogin = computed(() => {
  return isPhoneValid.value && verificationCode.value.length === 6 && verificationInfo.value
})

// 获取验证码
const getVerificationCode = async () => {
  if (!isPhoneValid.value) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  
  try {
    loading.value = true
    loadingText.value = '发送验证码中...'
    
    const result = await getPhoneVerification(phoneNumber.value)
    verificationInfo.value = result
    
    uni.showToast({
      title: '验证码发送成功',
      icon: 'success'
    })
    
    // 开始倒计时
    startCountdown()
    
  } catch (error: any) {
    console.error('获取验证码失败:', error)
    uni.showToast({
      title: error.message || '获取验证码失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

// 手机验证码登录
const handleLogin = async () => {
  if (!canLogin.value) {
    uni.showToast({
      title: '请完善登录信息',
      icon: 'none'
    })
    return
  }
  
  try {
    loading.value = true
    loadingText.value = '登录中...'
    await signInWithPhoneCode({
      verificationInfo: verificationInfo.value,
      verificationCode: verificationCode.value,
      phoneNum: phoneNumber.value
    })
    
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    
    setTimeout(() => {
      uni.redirectTo({
        url: '/pages/chat/home'
      })
    }, 1000)   
  } catch (error: any) {
    console.error('登录失败:', error)
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 返回登录方式选择
const goBack = () => {
  uni.navigateBack()
}

// 清理定时器
onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx;
  box-sizing: border-box;
}

/* 品牌头部 */
.brand-header {
  text-align: center;
  margin-bottom: 60rpx;
  padding-top: 60rpx;
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

.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: white;
  display: block;
  margin-bottom: 20rpx;
}

.subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
}

.login-form {
  background: white;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.1);
}

.input-group {
  margin-bottom: 40rpx;
}

.label {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
  font-weight: 500;
}

.input-field {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  box-sizing: border-box;
  background: #fafafa;
}

.input-field:focus {
  border-color: #667eea;
  background: white;
}

.verification-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.verification-input {
  flex: 1;
}

.get-code-btn {
  width: 200rpx;
  height: 88rpx;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12rpx;
  font-size: 24rpx;
  white-space: nowrap;
}

.get-code-btn:disabled {
  background: #ccc;
  color: #999;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-top: 40rpx;
}

.login-btn:disabled {
  background: #ccc;
  color: #999;
}

.back-login {
  text-align: center;
  margin-top: 40rpx;
}

.link-text {
  font-size: 28rpx;
  color: #667eea;
  text-decoration: underline;
}

.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background: white;
  padding: 40rpx 60rpx;
  border-radius: 12rpx;
  text-align: center;
}

.loading-content text {
  font-size: 28rpx;
  color: #333;
}
</style>

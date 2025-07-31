<template>
  <view class="login-container">
    <view class="login-header">
      <text class="title">邮箱验证码登录</text>
      <text class="subtitle">请输入邮箱地址获取验证码</text>
    </view>
    
    <view class="login-form">
      <!-- 邮箱输入 -->
      <view class="input-group">
        <text class="label">邮箱地址</text>
        <input 
          class="input-field"
          type="text"
          placeholder="请输入邮箱地址"
          v-model="email"
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
            :disabled="!isEmailValid || countdown > 0"
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
import { getEmailVerification, signInWithEmailCode, ensureLogin } from '../../utils/cloudbase'

// 响应式数据
const email = ref('')
const verificationCode = ref('')
const verificationInfo = ref<any>(null)
const countdown = ref(0)
const loading = ref(false)
const loadingText = ref('')

// 计时器
let timer: any = null

// 计算属性
const isEmailValid = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

const canLogin = computed(() => {
  return isEmailValid.value && verificationCode.value.length === 6 && verificationInfo.value
})

// 获取验证码
const getVerificationCode = async () => {
  if (!isEmailValid.value) {
    uni.showToast({
      title: '请输入正确的邮箱地址',
      icon: 'none'
    })
    return
  }
  
  try {
    loading.value = true
    loadingText.value = '发送验证码中...'
    
    const result = await getEmailVerification(email.value)
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

// 邮箱验证码登录
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
    
    await signInWithEmailCode({
      verificationInfo: verificationInfo.value,
      verificationCode: verificationCode.value,
      email: email.value
    })
    
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    })
    
    // 延迟跳转到首页
    setTimeout(() => {
      uni.navigateTo({
        url: '/pages/index/index'
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

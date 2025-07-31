<template>
  <!-- 使用 v-if 控制组件的创建和销毁 -->
  <view v-if="show">
    <uni-popup 
      ref="popup" 
      type="center" 
      :is-mask-click="false"
      @maskClick="handleCancel"
      @change="onPopupChange"
    >
      <view class="captcha-container">
        <view class="captcha-header">
          <text class="title">请完成安全验证</text>
          <text class="close-btn" @click="handleCancel">✕</text>
        </view>
        
        <view class="captcha-body">
          <!-- 显示图片验证码 -->
          <view class="captcha-image-wrapper">
            <view class="image-content">
              <image 
                v-if="captchaData.url" 
                class="captcha-img" 
                :src="captchaData.url" 
                mode="aspectFit"
                @error="onImageError"
              />
              <view v-else class="captcha-placeholder">
                <text>验证码加载中...</text>
              </view>
              <!-- 刷新时的加载动画 -->
              <view v-if="isRefreshing" class="refresh-overlay">
                <uni-load-more status="loading" :show-icon="true" color="#FFF"></uni-load-more>
              </view>
            </view>
            <!-- 刷新按钮 -->
            <view class="refresh-action" @click="handleRefresh">
              <text class="refresh-text">看不清？换一张</text>
            </view>
          </view>
          
          <!-- 验证码输入框 -->
          <input 
            class="captcha-input" 
            v-model="captchaCode" 
            placeholder="请输入验证码" 
            maxlength="6"
            @confirm="handleSubmit"
          />
        </view>
        
        <view class="captcha-actions">
          <button class="action-btn cancel-btn" @click="handleCancel">取消</button>
          <button 
            class="action-btn confirm-btn" 
            :class="{ 'disabled': !captchaCode || loading }"
            @click="handleSubmit" 
            :disabled="!captchaCode || loading"
          >
            {{ loading ? '验证中...' : '确定' }}
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { UniPopupInstance } from '@dcloudio/uni-ui'
import { auth } from '../utils/cloudbase'

const popup = ref<UniPopupInstance | null>(null)
const captchaCode = ref('')
// captchaData 用于存储验证码数据,包含图片 URL 、 token 、 state 等信息
const captchaData = ref<{ url: string; token: string; [key: string]: any }>({ url: '', token: '' }) 
const state = ref('')
const loading = ref(false)
const show = ref(false) // 控制 v-if 的响应式变量
const isRefreshing = ref(false)

// 这个 watch 会在 show 变为 true 后启动，直到 popup.value 被赋值
watch(popup, (newPopupInstance) => {
  // 一旦 popup.value 不再是 null，说明实例已准备就绪
  if (newPopupInstance && show.value) {
    console.log('Popup 实例已成功获取，正在打开...')
    newPopupInstance.open()
  }
})

// 图片加载错误处理
const onImageError = (e: any) => {
  console.error('验证码图片加载失败:', e.detail.errMsg)
  uni.showToast({
    title: '验证码图片加载失败',
    icon: 'none'
  })
}

// 刷新验证码
const handleRefresh = async () => {
  if (isRefreshing.value) return; // 防止重复点击
  
  console.log('开始刷新验证码...')
  isRefreshing.value = true
  
  const { token, data } = await auth.createCaptchaData({
    state: state.value,
  })
  // console.log('验证码刷新:', 'data:', data, 'token:', token)
  captchaData.value.token = token
  captchaData.value.url = data
  // console.log('验证码数据已更新:', captchaData.value)
  isRefreshing.value = false 
}

// 打开验证码弹窗
const openCaptcha = (data: any) => {
  console.log('打开验证码弹窗:', data)
  captchaData.value = data
  state.value = data.state
  captchaCode.value = ''
  show.value = true // 设置为 true，此时组件才会被挂载
}

const onPopupChange = (e: { show: boolean }) => {
  if (!e.show) {
    show.value = false
  }
}

// 关闭验证码弹窗
const closeCaptcha = () => {
  if (!popup.value) {
	// 坑：小程序获取不到popup实例也能弹出弹窗，通过show属性值来控制，导致运行在app端时无法关闭(没有popup实例)
    show.value = false // 如果 popup 实例不存在，直接设置 show 为 false
  }else {
    popup.value.close()
  }
  // 设置为 false，组件将被销毁
  show.value = false 
}

// 用户点击"确定"
const handleSubmit = async () => {
  if (!captchaCode.value.trim()) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (!captchaData.value.token) {
    uni.showToast({ title: '验证码数据异常', icon: 'none' })
    return
  }

  try {
    loading.value = true
    console.log('提交验证码:', captchaCode.value, 'token:', captchaData.value.token)
    const result = await auth.verifyCaptchaData({
      key: captchaCode.value,
      token: captchaData.value.token,
    });
    console.log('验证码提交成功:', result)
    uni.$emit('RESOLVE_CAPTCHA_DATA', result)
    closeCaptcha()
  } catch (error) {
    console.error('验证码验证失败:', error)
    uni.showToast({ title: '验证失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 用户点击"取消"或关闭
const handleCancel = () => {
  console.log('用户取消验证码输入')
  uni.$emit('RESOLVE_CAPTCHA_DATA', {
    error: 'user_cancelled',
    error_description: '用户取消了验证码输入'
  })
  closeCaptcha()
}

// 事件处理函数
const captchaDataHandler = (data: any) => {
  console.log('接收到 CAPTCHA_DATA_CHANGE 事件:', data)
  if (data && data.url && data.token) {
    isRefreshing.value = false; // 重置刷新状态
    openCaptcha(data)
  } else {
    console.warn('接收到的验证码数据格式不正确:', data)
    isRefreshing.value = false; // 重置刷新状态
  }
}

// 组件挂载
onMounted(() => {
  console.log('验证码组件已挂载，开始监听事件')
  uni.$on('CAPTCHA_DATA_CHANGE', captchaDataHandler)
})

// 组件卸载
onUnmounted(() => {
  console.log('验证码组件已卸载，移除事件监听')
  uni.$off('CAPTCHA_DATA_CHANGE', captchaDataHandler)
})
</script>

<style scoped>
.captcha-container {
  width: 320px;
  max-width: 90vw;
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  box-sizing: border-box;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.captcha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.title {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.close-btn {
  font-size: 20px;
  color: #999;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;
}

.close-btn:active {
  background: #e0e0e0;
}

.captcha-body {
  margin-bottom: 24px;
}

.captcha-image-wrapper {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.captcha-img {
  width: 160px;
  height: 60px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.captcha-placeholder {
  width: 160px;
  height: 60px;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.captcha-placeholder text {
  font-size: 14px;
  color: #999;
}

.captcha-input {
  width: 100%;
  height: 48px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 16px;
  box-sizing: border-box;
  text-align: center;
  letter-spacing: 4px;
}

.captcha-input:focus {
  border-color: #007aff;
}

.captcha-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 16px;
  border: none;
  margin: 0;
}

.cancel-btn {
  background-color: #f0f0f0;
  color: #333;
}

.cancel-btn:active {
  background-color: #e0e0e0;
}

.confirm-btn {
  background-color: #007aff;
  color: white;
}

.confirm-btn.is-disabled {
  background-color: #ccc;
  color: #999;
}
</style>
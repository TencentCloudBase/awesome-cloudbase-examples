<template>
  <view class="container">
    <view class="header">
      <text class="title">云开发功能演示</text>
      <text class="subtitle">CloudBase Demo</text>
    </view>

    <!-- 环境状态 -->
    <view class="section">
      <view class="section-title">环境状态</view>
      <view class="status-card" :class="{ 'status-error': !envValid }">
        <text class="status-text">{{ envStatus }}</text>
      </view>
    </view>

    <!-- 认证功能 -->
    <view class="section">
      <view class="section-title">身份认证</view>
      <view class="auth-info">
        <text class="auth-text">登录状态: {{ loginStatus }}</text>
      </view>
      <view class="button-group">
        <button class="btn btn-primary" @click="handleLogin" :disabled="loading">
          {{ loginStatus === '已登录' ? '重新登录' : '跳转登录' }}
        </button>
        <button class="btn btn-secondary" @click="handleLogout" :disabled="loading">
          退出登录
        </button>
      </view>
    </view>

    <!-- 云函数调用 -->
    <view class="section">
      <view class="section-title">云函数调用</view>
      <button class="btn btn-primary" @click="callCloudFunction" :disabled="loading">
        调用 hello 函数
      </button>
      <view v-if="functionResult" class="result-card">
        <text class="result-title">函数返回结果:</text>
        <text class="result-text">{{ functionResult }}</text>
      </view>
    </view>

    <!-- 调用云托管服务 -->
    <view class="section">
      <view class="section-title">云托管服务</view>
      <button class="btn btn-primary" @click="callCloudRunFunction" :disabled="loading">
        调用云托管服务
      </button>
      <view v-if="cloudrunResult" class="result-card">
        <text class="result-title">服务返回结果:</text>
        <text class="result-text">{{ cloudrunResult }}</text>
      </view>
    </view>

    <!-- 数据库操作 -->
    <view class="section">
      <view class="section-title">数据库操作</view>
      <view class="input-group">
        <input 
          class="input" 
          v-model="newRecord" 
          placeholder="输入要添加的数据"
          :disabled="loading"
        />
        <button class="btn btn-primary" @click="addRecord" :disabled="loading">
          添加数据
        </button>
      </view>
      <button class="btn btn-secondary" @click="queryRecords" :disabled="loading">
        查询数据
      </button>
      <view v-if="records.length > 0" class="records-list">
        <text class="result-title">数据库记录:</text>
        <view v-for="(record, index) in records" :key="index" class="record-item">
          <text class="record-text">{{ record.content }} ({{ record.createTime }})</text>
        </view>
      </view>
    </view>

    <!-- 数据库监听(websoket测试) -->
    <view class="section">
      <view class="section-title">数据库监听</view>
      <button class="btn btn-primary" @click="startListening" :disabled="loading">
        开始监听
      </button>
      <button class="btn btn-secondary" @click="stopListening" :disabled="loading || !watcher">
        停止监听
      </button>
      <view v-if="realtimeRecord" class="result-card">
        <text class="result-title">实时数据记录:</text>
        <text class="result-text">{{ realtimeRecord }}</text>
      </view>
    </view>

    <!-- 文件上传 -->
    <view class="section">
      <view class="section-title">文件上传</view>
      <button class="btn btn-primary" @click="chooseAndUploadFile" :disabled="loading">
        选择并上传文件
      </button>
      <view v-if="uploadProgress > 0 && uploadProgress < 100" class="progress-bar">
        <view class="progress-fill" :style="{ width: uploadProgress + '%' }"></view>
        <text class="progress-text">{{ uploadProgress }}%</text>
      </view>
      <view v-if="uploadResult" class="result-card">
        <text class="result-title">上传结果:</text>
        <text class="result-text">{{ uploadResult }}</text>
      </view>
    </view>

    <!-- 文件下载 -->
    <view class="section">
      <view class="section-title">文件下载</view>
      <button class="btn btn-primary" @click="downloadFile" :disabled="loading">
        下载文件
      </button>
      <view v-if="downloadResult" class="result-card">
        <text class="result-title">下载结果:</text>
        <text class="result-text">{{ downloadResult }}</text>
      </view>
      <view v-if="imageSrc" class="result-card">
        <image :src="imageSrc" mode="widthFix" class="downloaded-image"></image>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-spinner"></view>
      <text class="loading-text">处理中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  app,
  initCloudBase,
  ensureLogin,
  logout,
  checkEnvironment,
  isValidEnvId
} from '../../utils/cloudbase'

// 响应式数据
const loading = ref(false)
const envValid = ref(false)
const envStatus = ref('检查中...')
const loginStatus = ref('未知')
const functionResult = ref('')
const newRecord = ref('')
const records = ref<any[]>([])
const uploadProgress = ref(0)
const uploadResult = ref('')
// 新增
const downloadResult = ref('')
const imageSrc = ref('')

let watcher:any = null // 监听器
const realtimeRecord = ref('')
let isListening = false; // 防止多次点击

const cloudrunResult = ref('')

// 检查环境配置
const checkEnv = () => {
  envValid.value = checkEnvironment()
  envStatus.value = envValid.value ? '✅ 环境配置正常' : '❌ 环境ID未配置'
}

// 初始化
onMounted(async () => {
  checkEnv()
  if (envValid.value) {
    await initializeCloudBase()
  }
})

// 初始化云开发
const initializeCloudBase = async () => {
  loading.value = true
  try {
    const success = await initCloudBase()
    if (success) {
      loginStatus.value = '已登录'
    } else {
      loginStatus.value = '未登录'
    }
  } catch (error) {
    console.error('初始化失败:', error)
    loginStatus.value = '初始化失败'
  } finally {
    loading.value = false
  }
}

// 处理登录
const handleLogin = async () => {
  if (!envValid.value) {
    uni.showToast({ title: '请先配置环境ID', icon: 'none' })
    return
  }
  if(loginStatus.value === '未登录' || loginStatus.value === '登录失败' || loginStatus.value === '已退出') {
    uni.navigateTo({
      url: '/pages/login/index' // 跳转到登录页面
    })
    return
  }
  loading.value = true
  try {
    await ensureLogin()
    loginStatus.value = '已登录'
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error) {
    console.error('登录失败:', error)
    loginStatus.value = '登录失败'
    uni.showToast({ title: '登录失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 处理退出登录
const handleLogout = async () => {
  loading.value = true
  try {
    await logout()
    loginStatus.value = '已退出'
    uni.showToast({ title: '已退出登录', icon: 'success' })
  } catch (error) {
    console.error('退出失败:', error)
    uni.showToast({ title: '退出失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 调用云函数
const callCloudFunction = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const result = await app.callFunction({ name: 'hello', data: { name: 'UniApp' } })
    functionResult.value = JSON.stringify(result.result, null, 2)
    uni.showToast({ title: '调用成功', icon: 'success' })
  } catch (error: any) {
    console.error('云函数调用失败:', error)
    functionResult.value = '调用失败: ' + error.message
    uni.showToast({ title: '调用失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 调用云托管服务
const callCloudRunFunction = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  loading.value = true
  try {
   const result = await app.callFunction({ 
      name: 'express', 
      method: 'GET', // 使用 GET 方法调用云托管服务
      type: 'cloudrun', // 指定调用云托管服务
      path: '/api/users', // 替换为你的云托管服务路径
      header: { 'Content-Type': 'application/json; charset=UTF-8' },
      data: {
							key1: 'test value 1',
							key2: 'test value 2'
						},
      })
    cloudrunResult.value = JSON.stringify(result.result, null, 2)
    uni.showToast({ title: '调用成功', icon: 'success' })
  } catch (error: any) {
    console.error('云托管服务调用失败:', error)
    cloudrunResult.value = '调用失败: ' + error.errMsg
    uni.showToast({ title: '调用失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 添加数据
const addRecord = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  if (!newRecord.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const db = app.database()
    await db.collection('test').add({
      content: newRecord.value,
      createTime: new Date().toLocaleString()
    })
    newRecord.value = ''
    uni.showToast({ title: '添加成功', icon: 'success' })
    await queryRecords() // 自动刷新列表
  } catch (error: any) {
    console.error('添加数据失败:', error)
    uni.showToast({ title: '添加失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 查询数据
const queryRecords = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const db = app.database()
    const result = await db.collection('test').orderBy('createTime', 'desc').limit(10).get()
    records.value = result.data
    uni.showToast({ title: '查询成功', icon: 'success' })
  } catch (error: any) {
    console.error('查询数据失败:', error)
    uni.showToast({ title: '查询失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

// 实时监听数据变化
const startListening = async() => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (isListening) {
    uni.showToast({ title: '已在监听中', icon: 'none' })
    return
  }
  isListening = true

  loading.value = true
  const db = app.database()
  
  if (watcher) {
    watcher.close() // 如果之前有监听器，先关闭它
  }
  realtimeRecord.value = '' // 清空之前的记录
  // 开始监听数据变化
  const collection = db.collection('test')
  watcher = collection.watch({
    onChange: (snapshot:any) => {
      console.log('数据变化:', snapshot)
      if (snapshot.docChanges && snapshot.docChanges.length > 0) {
        snapshot.docChanges.forEach((change: any) => {
          switch (change.dataType) {
            case 'add':  // 新增数据
              realtimeRecord.value = `新增数据: ${change.doc.content} (${change.doc.createTime})`
              break
            case 'remove':  // 删除数据
              realtimeRecord.value = `删除数据: ${change.doc.content} (${change.doc.createTime})`
              break
          }
        });
      }
    },
    onError: (error: any) => {
      console.error('监听失败:', error)
      uni.showToast({ title: '监听失败', icon: 'error' })
    }
  })
  loading.value = false
}
// 停止监听
const stopListening = () => {
  if (watcher) {
    watcher.close()
    watcher = null
    isListening = false
    realtimeRecord.value = '' // 清空实时记录
    uni.showToast({ title: '监听已停止', icon: 'success' })
  }
}		
		
// 选择并上传文件
const chooseAndUploadFile = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const chooseResult: any = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        success: resolve,
        fail: reject
      })
    })

    if (chooseResult.tempFilePaths && chooseResult.tempFilePaths.length > 0) {
      const filePath = chooseResult.tempFilePaths[0]
      const cloudPath = `demo/${Date.now()}.jpg`

      uploadProgress.value = 0
      loading.value = true

      const result = await app.uploadFile({
        cloudPath,
        filePath,
        method: 'post',
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          uploadProgress.value = progress
        }
      })

      uploadResult.value = `文件上传成功\nFileID: ${result.fileID}`
      uni.showToast({ title: '上传成功', icon: 'success' })
    }
  } catch (error: any) {
    console.error('文件上传失败:', error)
    uploadResult.value = '上传失败: ' + error.message
    uni.showToast({ title: '上传失败', icon: 'error' })
  } finally {
    loading.value = false
    uploadProgress.value = 0
  }
}

// 下载文件
const downloadFile = async () => {
  if (loginStatus.value !== '已登录') {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  try {
    const fileID = 'cloud://cloud1-6g3islov04964ac4.636c-cloud1-6g3islov04964ac4-1363737591/demo/1750843025634.jpg' // 替换为你的文件ID
    loading.value = true

    const result:any = await app.downloadFile({
      fileID,
    })

    downloadResult.value = `文件下载成功\n临时路径: ${result.tempFilePath}`
    uni.showToast({ title: '下载成功', icon: 'success' })
    imageSrc.value = result.tempFilePath // 显示下载的图片
  } catch (error: any) {
    console.error('文件下载失败:', error)
    downloadResult.value = '下载失败: ' + error.message
    uni.showToast({ title: '下载失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}


</script>

<style scoped>
.container {
  padding: 20rpx;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  color: #666;
  margin-top: 10rpx;
  display: block;
}

.section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.status-card {
  padding: 20rpx;
  border-radius: 12rpx;
  background-color: #e8f5e8;
  border: 2rpx solid #4caf50;
}

.status-card.status-error {
  background-color: #ffeaea;
  border-color: #f44336;
}

.status-text {
  color: #333;
  font-size: 28rpx;
}

.auth-info {
  margin-bottom: 20rpx;
}

.auth-text {
  font-size: 28rpx;
  color: #666;
}

.button-group {
  display: flex;
  gap: 20rpx;
}

.btn {
  padding: 20rpx 40rpx;
  border-radius: 12rpx;
  border: none;
  font-size: 28rpx;
  flex: 1;
}

.btn-primary {
  background-color: #007aff;
  color: white;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn:disabled {
  opacity: 0.5;
}

.input-group {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.input {
  flex: 1;
  padding: 20rpx;
  border: 2rpx solid #ddd;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.result-card {
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx solid #e9ecef;
}

.result-title {
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 10rpx;
}

.result-text {
  color: #666;
  font-size: 24rpx;
  word-break: break-all;
}

.records-list {
  margin-top: 20rpx;
}

.record-item {
  padding: 15rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.record-text {
  font-size: 26rpx;
  color: #333;
}

.progress-bar {
  position: relative;
  height: 40rpx;
  background-color: #f0f0f0;
  border-radius: 20rpx;
  margin: 20rpx 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #007aff;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24rpx;
  color: #333;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f3f3f3;
  border-top: 4rpx solid #007aff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: white;
  font-size: 28rpx;
  margin-top: 20rpx;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

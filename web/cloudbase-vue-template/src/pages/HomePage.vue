<template>
  <div class="hero min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold text-gray-800 mb-8">CloudBase Vue</h1>
        <p class="text-xl text-gray-600 mb-8">
          基于 Vue 3 和腾讯云开发的现代化 Web 应用模板
        </p>
        
        <!-- 云开发状态显示 -->
        <div class="card bg-white shadow-xl mb-8">
          <div class="card-body">
            <h2 class="card-title justify-center text-gray-700">云开发状态</h2>
            
            <div class="flex items-center justify-center space-x-2 mt-4">
              <div 
                class="w-3 h-3 rounded-full"
                :class="cloudbaseStatus.connected ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <span class="text-sm font-medium">
                {{ cloudbaseStatus.connected ? '已连接' : '未连接' }}
              </span>
            </div>
            
            <div class="text-sm text-gray-500 mt-2">
              <p v-if="cloudbaseStatus.envId">环境ID: {{ cloudbaseStatus.envId }}</p>
              <p v-else class="text-orange-500">请配置环境ID</p>
            </div>
            
            <div v-if="loginState?.user" class="mt-4 p-3 bg-green-50 rounded-lg">
              <p class="text-sm text-green-700">
                ✅ 用户已登录 ({{ loginState?.user?.name }})
              </p>
            </div>
          </div>
        </div>
        
        <!-- 功能按钮 -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            class="btn btn-primary"
            @click="testCloudbaseConnection"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
            测试云开发连接
          </button>
          
          <button 
            class="btn btn-outline"
            @click="$router.push('/about')"
          >
            了解更多
          </button>
        </div>
        
        <!-- 快速开始指南 -->
        <div class="card bg-white shadow-xl mt-8">
          <div class="card-body text-left">
            <h3 class="card-title text-gray-700 mb-4">🚀 快速开始</h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-start space-x-3">
                <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p class="font-medium">配置云开发环境</p>
                  <p class="text-gray-500">编辑 <code class="bg-gray-100 px-1 rounded">src/utils/cloudbase.js</code> 文件，设置您的环境ID</p>
                </div>
              </div>
              
              <div class="flex items-start space-x-3">
                <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p class="font-medium">开始开发</p>
                  <p class="text-gray-500">使用云数据库、云函数、云存储等功能</p>
                </div>
              </div>

            </div>
          </div>
        </div>

       <Footer/>
      </div>
    </div>
  </div>
</template>

<script setup>
import Footer from '../components/Footer.vue'
import { ref, onMounted } from 'vue'
import { ensureLogin, checkEnvironment, isValidEnvId, ENV_ID } from '../utils/cloudbase.js'

// 响应式数据
const isLoading = ref(false)
const cloudbaseStatus = ref({
  connected: false,
  envId: isValidEnvId ? ENV_ID : null
})
const loginState = ref({
  user: null
})

// 测试云开发连接
const testCloudbaseConnection = async () => {
  isLoading.value = true
  try {
    const state = await ensureLogin()
    loginState.value = state
    cloudbaseStatus.value.connected = true
    
    // 显示成功消息
    console.log('云开发连接测试成功！')
  } catch (error) {
    console.error('云开发连接测试失败:', error)
    cloudbaseStatus.value.connected = false
  } finally {
    isLoading.value = false
  }
}

// 组件挂载时检查云开发状态
onMounted(async () => {
  // 检查环境配置
  const envValid = checkEnvironment()
  cloudbaseStatus.value.connected = envValid
  
  if (envValid) {
    // 尝试获取登录状态
    try {
      const state = await ensureLogin()
      loginState.value = state
    } catch (error) {
      console.warn('初始化登录状态失败:', error)
    }
  }
})
</script> 
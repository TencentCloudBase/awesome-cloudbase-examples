<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <router-link to="/" class="text-2xl font-bold text-gray-900 flex items-center">
          <i class="fas fa-chess-board mr-2 text-blue-600"></i>
          五子棋对战
        </router-link>
        <nav>
          <router-link to="/" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
            首页
          </router-link>
          <router-link to="/create" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
            创建房间
          </router-link>
          <router-link to="/join" class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
            加入房间
          </router-link>
        </nav>
      </div>
    </header>

    <main class="flex-grow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <footer class="bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p class="text-center text-gray-500 text-sm">
          © {{ new Date().getFullYear() }} 五子棋对战 | 基于腾讯云开发构建
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { login } from '@/utils/cloudbase';

// 应用加载时进行匿名登录
onMounted(async () => {
  try {
    await login();
    console.log('CloudBase 初始化成功');
  } catch (error) {
    console.error('CloudBase 初始化失败:', error);
    // 可以在这里添加重试逻辑或用户提示
  }
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 
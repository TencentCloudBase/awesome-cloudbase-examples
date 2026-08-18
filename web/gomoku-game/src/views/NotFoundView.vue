<template>
  <div class="not-found flex flex-col items-center justify-center py-16">
    <div class="text-6xl font-bold text-gray-300 mb-4">404</div>
    <h1 class="text-2xl font-semibold mb-4">页面未找到</h1>
    <p class="text-gray-600 mb-8">您访问的页面不存在或已被移除</p>
    <router-link to="/" class="btn btn-primary">
      <i class="fas fa-home mr-2"></i> 返回首页
    </router-link>
  </div>
</template> 
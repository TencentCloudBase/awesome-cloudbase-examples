<template>
  <div class="flex flex-col min-h-screen">
    <main class="flex-grow container mx-auto px-4 py-12">
      <div v-if="loading" class="h-screen flex items-center justify-center">
        <div class="loading loading-spinner loading-lg text-primary"></div>
        <p class="ml-2">加载中...</p>
      </div>

      <template v-else>
        <div class="text-center mb-16">
          <h1 class="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CloudBase Nuxt 模板
          </h1>
          <p class="text-lg md:text-xl max-w-2xl mx-auto opacity-80">
            快速开始构建集成了腾讯云开发能力的 Nuxt SSG 应用
          </p>
        </div>

        <div class="flex flex-col md:flex-row gap-8 mb-16">
          <div class="flex-1">
            <div class="card bg-base-200 shadow-xl h-full">
              <div class="card-body">
                <h2 class="card-title text-2xl mb-4">🚀 开始使用</h2>
                <div class="space-y-4 text-left">
                  <div class="p-4 bg-base-300 rounded-lg">
                    <p class="font-mono text-sm">1. 修改环境 ID</p>
                    <code class="block mt-2 p-2 bg-base-100 rounded text-xs">
                      // nuxt.config.ts<br />
                      runtimeConfig: { public: { envId: 'your-env-id' } }
                    </code>
                  </div>
                  <div class="p-4 bg-base-300 rounded-lg">
                    <p class="font-mono text-sm">2. 添加新页面</p>
                    <code class="block mt-2 p-2 bg-base-100 rounded text-xs">
                      // pages/about.vue<br />
                      &lt;template&gt;&lt;div&gt;关于页面&lt;/div&gt;&lt;/template&gt;
                    </code>
                  </div>
                  <div class="p-4 bg-base-300 rounded-lg">
                    <p class="font-mono text-sm">3. 使用云开发</p>
                    <code class="block mt-2 p-2 bg-base-100 rounded text-xs">
                      const { app, ensureLogin } = useCloudbase()<br /><br />
                      await ensureLogin()<br />
                      const db = app.database()
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1">
            <div class="card bg-base-200 shadow-xl h-full">
              <div class="card-body">
                <h2 class="card-title text-2xl mb-4">✨ 核心特性</h2>
                <div class="space-y-6">
                  <div v-for="(feature, index) in features" :key="index" class="flex items-start gap-4">
                    <div class="text-3xl">{{ feature.icon }}</div>
                    <div>
                      <h3 class="font-bold text-lg">{{ feature.title }}</h3>
                      <p class="opacity-80">{{ feature.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-4 mt-8">
          <a href="https://docs.cloudbase.net/" target="_blank" rel="noopener noreferrer" class="btn btn-primary">查看文档</a>
          <a href="https://github.com/TencentCloudBase/cloudbase-templates" target="_blank" rel="noopener noreferrer" class="btn btn-outline">更多模板</a>
        </div>

        <div class="mt-16 p-4 bg-base-200 rounded-lg text-center">
          <p class="opacity-60 text-sm">
            登录状态: {{ isLoggedIn ? '已登录 ✅' : '未登录' }} |
            <a href="https://console.cloud.tencent.com/tcb" target="_blank" rel="noopener noreferrer" class="underline">管理控制台</a>
          </p>
        </div>
      </template>
    </main>
    <Footer />
  </div>
</template>

<script setup>
const features = [
  { title: '前端框架', description: 'Nuxt 3 + Vue 3（SSG 静态生成）', icon: '🖥️' },
  { title: '样式方案', description: 'Tailwind CSS + DaisyUI', icon: '🎨' },
  { title: '云开发能力', description: '数据库、云函数、云存储', icon: '☁️' },
]

const isLoggedIn = ref(false)
const loading = ref(true)

onMounted(async () => {
  try {
    const { ensureLogin, checkEnvironment } = useCloudbase()
    if (!checkEnvironment()) { loading.value = false; return }
    await ensureLogin()
    isLoggedIn.value = true
  } catch (error) {
    console.error('登录失败', error)
  } finally {
    loading.value = false
  }
})
</script>

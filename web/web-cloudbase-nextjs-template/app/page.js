'use client'

import { useEffect, useState } from 'react'
import Footer from '@/components/Footer'
import { ensureLogin, checkEnvironment } from '@/utils/cloudbase'

const features = [
  { title: '前端框架', description: 'Next.js 15 + React 19（SSG 静态导出）', icon: '🖥️' },
  { title: '样式方案', description: 'Tailwind CSS + DaisyUI', icon: '🎨' },
  { title: '云开发能力', description: '数据库、云函数、云存储', icon: '☁️' },
]

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!checkEnvironment()) { setLoading(false); return }
        await ensureLogin()
        setIsLoggedIn(true)
      } catch (error) {
        console.error('登录失败', error)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="ml-2">加载中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CloudBase Next.js 模板
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-80">
            快速开始构建集成了腾讯云开发能力的 Next.js SSG 应用
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 mb-16">
          <div className="flex-1">
            <div className="card bg-base-200 shadow-xl h-full">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">🚀 开始使用</h2>
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-base-300 rounded-lg">
                    <p className="font-mono text-sm">1. 修改环境 ID</p>
                    <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                      // utils/cloudbase.js<br />
                      const ENV_ID = &apos;your-env-id&apos;;
                    </code>
                  </div>
                  <div className="p-4 bg-base-300 rounded-lg">
                    <p className="font-mono text-sm">2. 添加新页面</p>
                    <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                      // app/new-page/page.js<br />
                      export default function NewPage() &#123; ... &#125;
                    </code>
                  </div>
                  <div className="p-4 bg-base-300 rounded-lg">
                    <p className="font-mono text-sm">3. 使用云开发</p>
                    <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                      import &#123; app, ensureLogin &#125; from &apos;@/utils/cloudbase&apos;;<br /><br />
                      await ensureLogin();<br />
                      const db = app.database();
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="card bg-base-200 shadow-xl h-full">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-4">✨ 核心特性</h2>
                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="text-3xl">{feature.icon}</div>
                      <div>
                        <h3 className="font-bold text-lg">{feature.title}</h3>
                        <p className="opacity-80">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <a href="https://docs.cloudbase.net/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">查看文档</a>
          <a href="https://github.com/TencentCloudBase/cloudbase-templates" target="_blank" rel="noopener noreferrer" className="btn btn-outline">更多模板</a>
        </div>

        <div className="mt-16 p-4 bg-base-200 rounded-lg text-center">
          <p className="opacity-60 text-sm">
            登录状态: {isLoggedIn ? '已登录 ✅' : '未登录'} |{' '}
            <a href="https://console.cloud.tencent.com/tcb" target="_blank" rel="noopener noreferrer" className="underline">管理控制台</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

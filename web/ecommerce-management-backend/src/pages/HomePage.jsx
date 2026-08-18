import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const features = [
    {
      title: '前端框架',
      description: 'React 18 + Vite + React Router 6',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: '样式方案',
      description: 'Tailwind CSS + DaisyUI',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    },
    {
      title: '云开发能力',
      description: '数据库、云函数、云存储',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          CloudBase React 模板
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-80">
          快速开始构建集成了腾讯云开发能力的现代化 React 应用
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-8 mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1"
        >
          <div className="card bg-base-200 shadow-xl h-full">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">🚀 开始使用</h2>
              <div className="space-y-4 text-left">
                <div className="p-4 bg-base-300 rounded-lg">
                  <p className="font-mono text-sm">1. 修改环境 ID</p>
                  <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                    // src/utils/cloudbase.js<br />
                    const ENV_ID = 'your-env-id';
                  </code>
                </div>
                <div className="p-4 bg-base-300 rounded-lg">
                  <p className="font-mono text-sm">2. 添加新页面</p>
                  <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                    // src/App.jsx<br />
                    {'<Route path="/new-page" element={<NewPage />} />'}
                  </code>
                </div>
                <div className="p-4 bg-base-300 rounded-lg">
                  <p className="font-mono text-sm">3. 使用云开发</p>
                  <code className="block mt-2 p-2 bg-base-100 rounded text-xs">
                    import cloudbase from './utils/cloudbase';<br />
                    <br />
                    // 确保登录<br />
                    await cloudbase.ensureLogin();<br />
                    <br />
                    // 使用数据库<br />
                    const db = cloudbase.app.database();
                  </code>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex-1"
        >
          <div className="card bg-base-200 shadow-xl h-full">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">✨ 核心特性</h2>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="text-primary">{feature.icon}</div>
                    <div>
                      <h3 className="font-bold text-lg">{feature.title}</h3>
                      <p className="opacity-80">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex justify-center gap-4 mt-8"
      >
        <a
          href="https://docs.cloudbase.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          查看文档
        </a>
        <a
          href="https://github.com/TencentCloudBase/cloudbase-templates"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          更多模板
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-16 p-4 bg-base-200 rounded-lg text-center"
      >
        <p className="opacity-60 text-sm">
          当前环境 ID: {import.meta.env.VITE_ENV_ID || '未设置'} | 
          <a 
            href="https://console.cloud.tencent.com/tcb" 
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline"
          >
            管理控制台
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default HomePage; 
import { motion } from "framer-motion";
import { Cloud, Palette, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UPDATE_ENV_ID = `// src/utils/cloudbase.js

const ENV_ID = 'your-env-id';`;

const ADD_NEW_PAGE = `// src/App.jsx

<Route path="/new-page" element={<NewPage />} />`;

const USE_CLOUDBASE = `import cloudbase from './utils/cloudbase';

// 确保登录
await cloudbase.ensureLogin();

// 使用数据库
const db = cloudbase.app.database();`;

const HomePage = () => {
  const navigate = useNavigate();
  
  const features = [
    {
      title: "前端框架",
      description: "React 18 + Vite + React Router 6",
      icon: <Rocket className="h-10 w-10" />,
    },
    {
      title: "样式方案",
      description: "Tailwind CSS + DaisyUI",
      icon: <Palette className="h-10 w-10" />,
    },
    {
      title: "云开发能力",
      description: "数据库、云函数、云存储",
      icon: <Cloud className="h-10 w-10" />,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-16 text-center"
      >
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
          CloudBase React 模板
        </h1>
        <p className="mx-auto max-w-3xl text-lg opacity-80 md:text-xl">
          快速开始构建集成了腾讯云开发能力的现代化 React 应用
        </p>
      </motion.div>

      <div className="mb-16 flex flex-col gap-8 md:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1"
        >
          <div className="card h-full rounded-3xl border border-base-200 bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title mb-4 text-2xl">🚀 开始使用</h2>
              <div className="space-y-4 text-left">
                <div className="rounded-2xl bg-base-200 p-4">
                  <p className="font-mono text-sm">1. 修改环境 ID</p>
                  <code className="mt-2 block whitespace-pre-wrap rounded-xl bg-base-100 p-3 text-xs">
                    {UPDATE_ENV_ID}
                  </code>
                </div>
                <div className="rounded-2xl bg-base-200 p-4">
                  <p className="font-mono text-sm">2. 添加新页面</p>
                  <code className="mt-2 block whitespace-pre-wrap rounded-xl bg-base-100 p-3 text-xs">
                    {ADD_NEW_PAGE}
                  </code>
                </div>
                <div className="rounded-2xl bg-base-200 p-4">
                  <p className="font-mono text-sm">3. 使用云开发</p>
                  <code className="mt-2 block whitespace-pre-wrap rounded-xl bg-base-100 p-3 text-xs">
                    {USE_CLOUDBASE}
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
          <div className="card h-full rounded-3xl border border-base-200 bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title mb-4 text-2xl">✨ 核心特性</h2>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-start gap-4 rounded-2xl bg-base-200/70 p-5"
                  >
                    <div className="text-primary">{feature.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
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
        className="mt-8 flex flex-wrap justify-center gap-4"
      >
        <button
          onClick={() => navigate('/crm')}
          className="btn btn-primary btn-lg"
        >
          🚀 进入 CRM 系统
        </button>
        <a
          href="https://docs.cloudbase.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          查看文档
        </a>
        <a
          href="https://github.com/TencentCloudBase/awesome-cloudbase-examples"
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
        className="mt-16 rounded-3xl border border-base-200 bg-base-100 p-4 text-center shadow-lg"
      >
        <p className="text-sm opacity-60">
          当前环境 ID: {import.meta.env.VITE_ENV_ID || "未设置"} |
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

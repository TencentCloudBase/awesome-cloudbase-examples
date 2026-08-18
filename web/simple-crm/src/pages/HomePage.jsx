import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CloudIcon,
  ShieldCheckIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const features = [
    {
      title: '客户管理',
      description: '全面管理客户基本信息，包括姓名、联系方式、公司等',
      icon: <UserGroupIcon className="h-10 w-10" />
    },
    {
      title: '互动记录',
      description: '记录客户沟通历史，跟进状态，提升客户关系管理效率',
      icon: <ChatBubbleLeftRightIcon className="h-10 w-10" />
    },
    {
      title: '数据可视化',
      description: '智能生成统计图表，客户增长趋势和行业分布一目了然',
      icon: <ChartBarIcon className="h-10 w-10" />
    }
  ];

  const techFeatures = [
    {
      title: '云原生架构',
      description: '基于腾讯云开发，无服务器架构，弹性扩容',
      icon: <CloudIcon className="h-8 w-8" />
    },
    {
      title: '安全可靠',
      description: '企业级安全保障，数据加密存储',
      icon: <ShieldCheckIcon className="h-8 w-8" />
    },
    {
      title: '智能化',
      description: '集成AI能力，智能分析客户数据',
      icon: <CpuChipIcon className="h-8 w-8" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI CRM 系统
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-700 mb-8">
            基于云开发的智能客户关系管理系统，让客户管理更简单、更高效
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              to="/login"
              className="btn btn-primary btn-lg px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 border-none hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              立即登录
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
            <a
              href="https://docs.cloudbase.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-lg px-8 py-3 text-lg font-semibold"
            >
              了解更多
            </a>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="text-blue-600 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Tech Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl shadow-lg p-8 mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">技术优势</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {techFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-blue-600 mb-4 flex justify-center">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="text-center bg-white rounded-xl shadow-lg p-8"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-4">开始您的CRM之旅</h3>
          <p className="text-gray-600 mb-6">
            立即登录体验智能客户关系管理系统的强大功能
          </p>
          <Link
            to="/login"
            className="btn btn-primary btn-lg px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 border-none hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            立即开始
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage; 
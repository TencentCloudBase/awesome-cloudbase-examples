import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import cloudbase from '../utils/cloudbase';
import Navbar from '../components/Navbar';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const loginState = await cloudbase.getLoginState();
        if (loginState && loginState.user) {
          setUser(loginState.user);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await cloudbase.logout();
      // 刷新页面，让App组件重新检查登录状态
      window.location.href = '/';
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使退出失败，也刷新页面
      window.location.href = '/';
    }
  };

  const handleModuleClick = (module) => {
    if (!module.comingSoon) {
      navigate(module.path);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="ml-2">加载中...</p>
      </div>
    );
  }

  // 功能模块配置
  const modules = [
    {
      id: 'customers',
      title: '客户管理',
      description: '管理客户基本信息，包括姓名、联系方式、公司等',
      icon: UserGroupIcon,
      color: 'from-blue-500 to-blue-600',
      path: '/customers',
      comingSoon: false
    },
    {
      id: 'interactions',
      title: '互动记录',
      description: '记录客户沟通历史，跟进状态管理',
      icon: ChatBubbleLeftRightIcon,
      color: 'from-green-500 to-green-600',
      path: '/interactions',
      comingSoon: false
    },
    {
      id: 'analytics',
      title: '数据可视化',
      description: '客户增长趋势，行业分布等统计图表',
      icon: ChartBarIcon,
      color: 'from-purple-500 to-purple-600',
      path: '/analytics',
      comingSoon: false
    },
    {
      id: 'settings',
      title: '系统设置',
      description: '个人设置和系统配置',
      icon: Cog6ToothIcon,
      color: 'from-gray-500 to-gray-600',
      path: '/settings',
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  欢迎回来！
                </h1>
                <p className="text-gray-600">
                  用户ID: {user?.uid || '未知'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>退出登录</span>
            </button>
          </div>
        </motion.div>

        {/* 功能模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${module.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <module.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {module.title}
                      </h3>
                      {module.comingSoon && (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          即将推出
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {module.description}
                    </p>
                    
                    <button
                      onClick={() => handleModuleClick(module)}
                      disabled={module.comingSoon}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        module.comingSoon
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${module.color} text-white hover:opacity-90`
                      }`}
                    >
                      {module.comingSoon ? '敬请期待' : '进入模块'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 系统状态 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-800">云开发服务</p>
              <p className="text-xs text-green-600">正常运行</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-800">数据库连接</p>
              <p className="text-xs text-green-600">正常运行</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="text-sm font-medium text-green-800">身份认证</p>
              <p className="text-xs text-green-600">正常运行</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;

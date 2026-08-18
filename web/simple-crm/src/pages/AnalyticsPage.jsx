import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import cloudbase from '../utils/cloudbase';
import Navbar from '../components/Navbar';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({});
  const [customerGrowthData, setCustomerGrowthData] = useState(null);
  const [industryData, setIndustryData] = useState(null);
  const [interactionData, setInteractionData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // 并行加载所有数据
      const [overviewRes, growthRes, industryRes, interactionRes, statusRes] = await Promise.all([
        cloudbase.app.callFunction({
          name: 'dx_analytics',
          data: { action: 'getDashboardOverview' }
        }),
        cloudbase.app.callFunction({
          name: 'dx_analytics',
          data: { action: 'getCustomerGrowthTrend', data: { period: 'month', limit: 6 } }
        }),
        cloudbase.app.callFunction({
          name: 'dx_analytics',
          data: { action: 'getIndustryDistribution' }
        }),
        cloudbase.app.callFunction({
          name: 'dx_analytics',
          data: { action: 'getInteractionStats' }
        }),
        cloudbase.app.callFunction({
          name: 'dx_analytics',
          data: { action: 'getFollowUpStatusDistribution' }
        })
      ]);

      if (overviewRes.result.success) {
        setOverview(overviewRes.result.data);
      }

      if (growthRes.result.success) {
        setCustomerGrowthData(growthRes.result.data);
      }

      if (industryRes.result.success) {
        setIndustryData(industryRes.result.data);
      }

      if (interactionRes.result.success) {
        setInteractionData(interactionRes.result.data);
      }

      if (statusRes.result.success) {
        setStatusData(statusRes.result.data);
      }

    } catch (error) {
      console.error('加载数据分析失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
            <p className="text-gray-600">加载数据分析...</p>
          </div>
        </div>
      </div>
    );
  }

  // 图表配置选项
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-2">
            <ChartBarIcon className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">数据可视化</h1>
          </div>
          <p className="text-gray-600">客户管理系统数据统计与分析</p>
        </motion.div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总客户数</p>
                <p className="text-3xl font-bold text-blue-600">{overview.totalCustomers || 0}</p>
              </div>
              <UserGroupIcon className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">本月新增</p>
                <p className="text-3xl font-bold text-green-600">{overview.newCustomersThisMonth || 0}</p>
              </div>
              <ArrowTrendingUpIcon className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">互动记录</p>
                <p className="text-3xl font-bold text-purple-600">{overview.totalInteractions || 0}</p>
              </div>
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">成交率</p>
                <p className="text-3xl font-bold text-orange-600">{overview.conversionRate || '0.0'}%</p>
              </div>
              <CheckCircleIcon className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </motion.div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 客户增长趋势 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">客户增长趋势</h3>
            <div className="h-80">
              {customerGrowthData && customerGrowthData.labels.length > 0 ? (
                <Line data={customerGrowthData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 行业分布 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">客户行业分布</h3>
            <div className="h-80">
              {industryData && industryData.labels.length > 0 ? (
                <Doughnut data={industryData} options={pieOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 互动类型统计 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">互动类型统计</h3>
            <div className="h-80">
              {interactionData && interactionData.labels.length > 0 ? (
                <Bar data={interactionData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* 跟进状态分布 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">客户跟进状态</h3>
            <div className="h-80">
              {statusData && statusData.labels.length > 0 ? (
                <Pie data={statusData} options={pieOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无数据</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* 刷新按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-center"
        >
          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                刷新中...
              </>
            ) : (
              '刷新数据'
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

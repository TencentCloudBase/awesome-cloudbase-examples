import React, { useState, useEffect } from 'react';
import {
  ShoppingBagIcon,
  UsersIcon,
  DocumentTextIcon,
  GiftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { app, ensureLogin } from '../utils/cloudbase';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalGoods: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalPromotions: 0,
    onlineGoods: 0,
    completedOrders: 0,
    activePromotions: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState([]);

  // 获取统计数据
  const fetchStats = async () => {
    try {
      setLoading(true);
      await ensureLogin();
      const db = app.database();

      // 并行获取各种统计数据
      const [
        goodsCount,
        usersCount,
        ordersCount,
        promotionsCount,
        onlineGoodsCount,
        completedOrdersCount,
        recentOrdersData
      ] = await Promise.all([
        db.collection('goods').count(),
        db.collection('user').count(),
        db.collection('order').count(),
        db.collection('salesPromotion').count(),
        db.collection('goods').where({ status: 'online' }).count(),
        db.collection('order').where({ status: 'completed' }).count(),
        db.collection('order').orderBy('createTime', 'desc').limit(5).get()
      ]);

      // 计算总收入
      const completedOrders = await db.collection('order')
        .where({ status: 'completed' })
        .get();
      
      const totalRevenue = completedOrders.data.reduce((sum, order) => sum + order.totalPrice, 0);

      // 获取活跃促销活动数量
      const now = new Date();
      const activePromotions = await db.collection('salesPromotion')
        .where({
          startTime: db.command.lte(now),
          endTime: db.command.gte(now)
        })
        .count();

      setStats({
        totalGoods: goodsCount.total,
        totalUsers: usersCount.total,
        totalOrders: ordersCount.total,
        totalPromotions: promotionsCount.total,
        onlineGoods: onlineGoodsCount.total,
        completedOrders: completedOrdersCount.total,
        activePromotions: activePromotions.total,
        totalRevenue: totalRevenue
      });

      setRecentOrders(recentOrdersData.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statusLabels = {
    pending: '待发货',
    shipped: '已发货',
    completed: '已完成',
    refunded: '已退款'
  };

  const statusColors = {
    pending: 'badge-warning',
    shipped: 'badge-info',
    completed: 'badge-success',
    refunded: 'badge-error'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
        <p className="text-gray-600">电商管理系统概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">商品总数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGoods}</p>
              <p className="text-xs text-gray-500">在线: {stats.onlineGoods}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <UsersIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">会员总数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-xs text-gray-500">注册会员</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <DocumentTextIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">订单总数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500">已完成: {stats.completedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <GiftIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">促销活动</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPromotions}</p>
              <p className="text-xs text-gray-500">进行中: {stats.activePromotions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 收入统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">总收入</h3>
            <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            ¥{stats.totalRevenue.toLocaleString()}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            来自 {stats.completedOrders} 个已完成订单
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">业务概览</h3>
            <ChartBarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">商品上架率</span>
              <span className="text-sm font-medium">
                {stats.totalGoods > 0 ? Math.round((stats.onlineGoods / stats.totalGoods) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">订单完成率</span>
              <span className="text-sm font-medium">
                {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">活跃促销率</span>
              <span className="text-sm font-medium">
                {stats.totalPromotions > 0 ? Math.round((stats.activePromotions / stats.totalPromotions) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 最近订单 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">最近订单</h3>
        </div>
        <div className="overflow-hidden">
          {recentOrders.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总价
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.goodsSku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{order.totalPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createTime).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              暂无订单数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

// @ts-ignore;
import React, { useState, useEffect } from 'react';
// @ts-ignore;
import {
  User,
  Search,
  Calendar,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit,
  Camera,
  RefreshCw
} from 'lucide-react';

import { Navbar, TabBar } from '@/components';
export default function ProfilePage(props) {
  const [userInfo] = useState({
    name: '艺术爱好者',
    email: 'art.lover@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    joinDate: '2024年1月',
    favoriteCount: 12,
    visitCount: 8
  });

  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // 展览ID到标题的映射（可以从展览数据源获取，这里先用静态映射）
  const getExhibitionTitle = (exhibitionId) => {
    const exhibitionMap = {
      '1': '印象派大师作品展',
      '2': '现代艺术精品展',
      '3': '古典艺术珍藏展',
      '4': '当代雕塑艺术展',
      '5': '摄影艺术展览'
    };
    return exhibitionMap[exhibitionId] || `展览 #${exhibitionId}`;
  };

  // 格式化日期显示
  const formatDate = (dateStr) => {
    if (!dateStr) return '待定';
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    } catch (e) {
      return dateStr;
    }
  };

  // 获取用户预约数据
  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      const result = await props.$w.cloud.callDataSource({
        dataSourceName: 'appointment',
        methodName: 'wedaGetRecordsV2',
        params: {
          pageSize: 5, // 获取最近5个预约
          pageNumber: 1,
          select: {
            $master: true
          },
          // 可以添加过滤条件，比如按用户ID过滤
          // filter: {
          //   where: {
          //     userId: userInfo.id
          //   }
          // }
        }
      });
      setAppointments(result.records || []);
    } catch (err) {
      console.error('获取预约数据失败:', err);
      setAppointmentsError(err.message);
      // 如果获取失败，使用默认数据
      setAppointments([
        {
          _id: '1',
          exhibitionId: '1',
          date: '2024-01-15',
          time: '14:00 - 15:00',
          name: '测试用户',
          phone: '13800138000',
          email: 'test@example.com'
        },
        {
          _id: '2',
          exhibitionId: '2',
          date: '2024-01-20',
          time: '10:00 - 11:00',
          name: '测试用户',
          phone: '13800138000',
          email: 'test@example.com'
        }
      ]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // 监听页面焦点，当页面重新获得焦点时刷新数据
  useEffect(() => {
    const handleFocus = () => {
      fetchAppointments();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const menuItems = [
    {
      icon: Search,
      title: '艺术品搜索',
      subtitle: '搜索感兴趣的艺术品',
      action: () => navigateToArtworkSearch(),
      color: 'text-blue-500'
    },
    {
      icon: Calendar,
      title: '参观记录',
      subtitle: `${userInfo.visitCount}次参观`,
      action: () => navigateToVisitHistory(),
      color: 'text-blue-500'
    },
    {
      icon: Bell,
      title: '消息通知',
      subtitle: '展览提醒、活动通知',
      action: () => navigateToNotifications(),
      color: 'text-orange-500'
    },
    {
      icon: Settings,
      title: '设置',
      subtitle: '账户设置、隐私设置',
      action: () => navigateToSettings(),
      color: 'text-gray-500'
    },
    {
      icon: HelpCircle,
      title: '帮助与反馈',
      subtitle: '常见问题、意见反馈',
      action: () => navigateToHelp(),
      color: 'text-green-500'
    }
  ];

  const navigateToArtworkSearch = () => {
    props.$w.utils.navigateTo({
      pageId: 'ArtworkSearchPage'
    });
  };

  const navigateToVisitHistory = () => {
    // TODO: 创建参观记录页面
    console.log('Navigate to visit history');
  };

  const navigateToNotifications = () => {
    // TODO: 创建通知页面
    console.log('Navigate to notifications');
  };

  const navigateToSettings = () => {
    // TODO: 创建设置页面
    console.log('Navigate to settings');
  };

  const navigateToHelp = () => {
    // TODO: 创建帮助页面
    console.log('Navigate to help');
  };

  const handleLogout = () => {
    // TODO: 实现登出逻辑
    console.log('Logout');
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      <Navbar title="我的" showSearch={false} />
      
      {/* 用户信息卡片 */}
      <div className="px-4 pt-4 pb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img 
                src={userInfo.avatar} 
                alt="用户头像" 
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
              />
              <button className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1.5 shadow-md">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-gray-800">{userInfo.name}</h2>
                <button className="text-blue-500">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600">{userInfo.email}</p>
              <p className="text-xs text-gray-500 mt-1">加入于 {userInfo.joinDate}</p>
            </div>
          </div>
          
          {/* 统计信息 */}
          <div className="flex justify-around mt-6 pt-4 border-t border-blue-200">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{appointments.length}</p>
              <p className="text-xs text-gray-600">预约</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-purple-600">{userInfo.visitCount}</p>
              <p className="text-xs text-gray-600">参观</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-green-600">5</p>
              <p className="text-xs text-gray-600">评价</p>
            </div>
          </div>
        </div>
      </div>

      {/* 我的预约 */}
      <div className="px-4 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">我的预约</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchAppointments}
                disabled={appointmentsLoading}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                title="刷新预约数据"
              >
                <RefreshCw className={`w-4 h-4 ${appointmentsLoading ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-sm text-blue-500">查看全部</span>
            </div>
          </div>

          {appointmentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse"></div>
              ))}
            </div>
          ) : appointmentsError ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">加载失败</p>
              <p className="text-sm text-gray-400">使用默认数据展示</p>
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.slice(0, 3).map(appointment => (
                <div key={appointment._id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 text-sm mb-1">
                        {getExhibitionTitle(appointment.exhibitionId)}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-1">
                        <span>📅 {formatDate(appointment.date)}</span>
                        <span>🕐 {appointment.time || '待定'}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>👤 {appointment.name || '未知'}</span>
                        <span>📱 {appointment.phone || '未知'}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                        已预约
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">📅</div>
              <p className="text-gray-500 mb-1">暂无预约记录</p>
              <p className="text-sm text-gray-400">快去预约感兴趣的展览吧</p>
            </div>
          )}
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              } ${index === 0 ? 'rounded-t-xl' : ''} ${
                index === menuItems.length - 1 ? 'rounded-b-xl' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <div className="text-left">
                  <p className="font-medium text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 登出按钮 */}
      <div className="px-4 mt-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 bg-red-50 text-red-600 py-3 rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">退出登录</span>
        </button>
      </div>

      <TabBar activeTab="profile" />
    </div>
  );
}

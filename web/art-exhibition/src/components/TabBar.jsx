// @ts-ignore;
import React from 'react';
// @ts-ignore;
import { Home, Calendar, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function TabBar({
  activeTab = 'home'
}) {
  const location = useLocation();

  // 根据当前路径确定活跃标签
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('HomePage')) return 'home';
    if (path.includes('ExhibitionsPage')) return 'exhibitions';
    if (path.includes('ArtworkSearchPage')) return 'search';
    if (path.includes('ProfilePage')) return 'profile';
    return activeTab;
  };

  const currentTab = getCurrentTab();

  const handleTabClick = (pageId) => {
    // 使用全局的 $w 对象
    if (window.$w && window.$w.utils && window.$w.utils.navigateTo) {
      window.$w.utils.navigateTo({ pageId });
    }
  };

  return <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200">
      <div className="flex justify-around py-3">
        <button onClick={() => handleTabClick('HomePage')} className={`${currentTab === 'home' ? 'text-blue-500' : 'text-gray-500'} flex flex-col items-center`}>
          <Home className="w-5 h-5" />
          <span className="text-xs mt-1">首页</span>
        </button>
        <button onClick={() => handleTabClick('ExhibitionsPage')} className={`${currentTab === 'exhibitions' ? 'text-blue-500' : 'text-gray-500'} flex flex-col items-center`}>
          <Calendar className="w-5 h-5" />
          <span className="text-xs mt-1">展览</span>
        </button>
        <button onClick={() => handleTabClick('ArtworkSearchPage')} className={`${currentTab === 'search' ? 'text-blue-500' : 'text-gray-500'} flex flex-col items-center`}>
          <Search className="w-5 h-5" />
          <span className="text-xs mt-1">搜索</span>
        </button>
        <button onClick={() => handleTabClick('ProfilePage')} className={`${currentTab === 'profile' ? 'text-blue-500' : 'text-gray-500'} flex flex-col items-center`}>
          <User className="w-5 h-5" />
          <span className="text-xs mt-1">我的</span>
        </button>
      </div>
    </nav>;
}
// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { Filter, Home, Calendar, Heart, User } from 'lucide-react';

import { Navbar, TabBar, ExhibitionCard } from '@/components';
export default function ExhibitionsPage(props) {
  const [activeTab, setActiveTab] = useState('current');
  const [exhibitions] = useState([{
    id: 1,
    title: '印象派大师展',
    date: '2025.06.01 - 2025.07.30',
    description: '汇集了莫奈、雷诺阿等印象派大师的经典作品，带您领略光影的魅力。',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    location: '1号展厅'
  }, {
    id: 2,
    title: '当代艺术展',
    date: '2025.06.15 - 2025.08.15',
    description: '展示当代艺术家的创新作品，探索艺术与科技的融合。',
    image: 'https://images.unsplash.com/photo-1531913764164-f85c52e6e654',
    location: '2号展厅'
  }, {
    id: 3,
    title: '中国古代书画展',
    date: '2025.07.01 - 2025.09.30',
    description: '精选宋元明清各时期名家书画作品，展现中国传统艺术的精髓。',
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04',
    location: '3号展厅'
  }]);
  const navigateToExhibitionDetail = id => {
    props.$w.utils.navigateTo({
      pageId: 'ExhibitionDetailPage',
      params: {
        id
      }
    });
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen">
      <Navbar title="展览" showSearch={false} />
      
      {/* 展览分类标签 */}
      <div className="px-4 pt-2 pb-4 border-b border-gray-200">
        <div className="flex space-x-6">
          <button className={`pb-2 font-medium ${activeTab === 'current' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`} onClick={() => setActiveTab('current')}>
            当前展览
          </button>
          <button className={`pb-2 font-medium ${activeTab === 'upcoming' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`} onClick={() => setActiveTab('upcoming')}>
            即将举办
          </button>
          <button className={`pb-2 font-medium ${activeTab === 'past' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`} onClick={() => setActiveTab('past')}>
            往期展览
          </button>
        </div>
      </div>

      {/* 展览列表 */}
      <main className="pb-20">
        <div className="space-y-4 p-4">
          {exhibitions.map(exhibition => <ExhibitionCard key={exhibition.id} exhibition={exhibition} onClick={() => navigateToExhibitionDetail(exhibition.id)} />)}
        </div>
      </main>

      <TabBar activeTab="exhibitions" />
    </div>;
}
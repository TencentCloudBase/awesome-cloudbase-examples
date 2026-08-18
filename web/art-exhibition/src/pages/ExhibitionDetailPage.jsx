// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { ArrowLeft, Ticket, Calendar, MapPin } from 'lucide-react';

import { Navbar } from '@/components';
export default function ExhibitionDetailPage(props) {
  const params = props.$w.page.dataset.params;
  const [exhibition] = useState({
    id: 1,
    title: '印象派大师展',
    date: '2025.06.01 - 2025.07.30',
    location: '艺术馆1号展厅',
    description: '本次展览汇集了莫奈、雷诺阿、德加等印象派大师的经典作品，共计80余件。展览通过"光影的探索"、"色彩的解放"、"瞬间的捕捉"三个主题单元，全面展示印象派艺术的革命性创新。特别展出的莫奈《睡莲》系列和雷诺阿《煎饼磨坊的舞会》等名作，将带您领略19世纪法国艺术的独特魅力。',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
    artists: ['克劳德·莫奈', '皮埃尔·奥古斯特·雷诺阿', '埃德加·德加', '卡米耶·毕沙罗']
  });
  const handleBookTicket = () => {
    props.$w.utils.navigateTo({
      pageId: 'AppointmentPage',
      params: {
        exhibitionId: exhibition.id,
        exhibitionTitle: exhibition.title,
        exhibitionDate: exhibition.date,
        exhibitionLocation: exhibition.location
      }
    });
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* 展览头部图片 */}
      <div className="relative">
        <img src={exhibition.image} alt="展览图片" className="w-full h-[250px] object-cover" />
        <button onClick={() => props.$w.utils.navigateBack()} className="absolute top-4 left-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 展览详情内容 */}
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{exhibition.title}</h1>
        <div className="flex items-center text-gray-500 mb-4">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{exhibition.date}</span>
        </div>
        <div className="flex items-center text-gray-500 mb-6">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{exhibition.location}</span>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">展览介绍</h2>
          <p className="text-gray-600 leading-relaxed">
            {exhibition.description}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">参展艺术家</h2>
          <div className="flex flex-wrap gap-2">
            {exhibition.artists.map(artist => <span key={artist} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {artist}
              </span>)}
          </div>
        </div>

        <button onClick={handleBookTicket} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center transition-colors">
          <Ticket className="w-5 h-5 mr-2" />
          立即购票
        </button>
      </div>
    </div>;
}
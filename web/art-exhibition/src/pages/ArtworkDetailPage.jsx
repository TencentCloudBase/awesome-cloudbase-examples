// @ts-ignore;
import React, { useState } from 'react';
// @ts-ignore;
import { ArrowLeft, Heart, Palette, Ruler, Calendar } from 'lucide-react';

import { Navbar } from '@/components';
export default function ArtworkDetailPage(props) {
  const params = props.$w.page.dataset.params;
  const [artwork, setArtwork] = useState({
    id: 1,
    title: '星空',
    artist: '文森特·梵高',
    type: '油画',
    size: '73.7 × 92.1 cm',
    description: '《星空》是荷兰后印象派画家文森特·梵高于1889年在法国圣雷米的一家精神病院里创作的一幅著名油画。这幅画展现了梵高对夜空充满想象力的诠释，旋转的笔触和强烈的色彩对比创造出一个充满动感的宇宙景象。画面中的柏树像火焰般向上延伸，与天空中的星云形成呼应，表达了艺术家内心的躁动与对自然的敬畏。',
    background: '梵高在创作《星空》时正处于精神极度不稳定的时期，但这幅作品却展现了他惊人的艺术控制力。他在给弟弟提奥的信中写道："今早，我在日出前很久就从窗户看到了乡村，除了晨星外什么都没有，这颗星星看起来非常大。"这幅作品现藏于纽约现代艺术博物馆，是世界上最知名的艺术作品之一。',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb39268b5b',
    isLiked: false,
    currentExhibition: '印象派大师展'
  });
  const toggleLike = () => {
    setArtwork(prev => ({
      ...prev,
      isLiked: !prev.isLiked
    }));
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* 艺术品图片 */}
      <div className="relative">
        <img src={artwork.image} alt="艺术品" className="w-full h-[300px] object-cover" />
        <button onClick={() => props.$w.utils.navigateBack()} className="absolute top-4 left-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={toggleLike} className={`absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center ${artwork.isLiked ? 'text-red-500' : ''}`}>
          <Heart className="w-5 h-5" fill={artwork.isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 艺术品详情内容 */}
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{artwork.title}</h1>
        <p className="text-lg text-gray-600 mb-4">{artwork.artist}</p>

        <div className="flex items-center text-gray-500 mb-6">
          <Palette className="w-4 h-4 mr-2" />
          <span className="mr-4">{artwork.type}</span>
          <Ruler className="w-4 h-4 mr-2" />
          <span>{artwork.size}</span>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">作品介绍</h2>
          <p className="text-gray-600 leading-relaxed">
            {artwork.description}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">创作背景</h2>
          <p className="text-gray-600 leading-relaxed">
            {artwork.background}
          </p>
        </div>

        <div className="flex justify-between items-center border-t border-gray-200 pt-4">
          <div>
            <p className="text-sm text-gray-500">当前展览</p>
            <p className="text-blue-500">{artwork.currentExhibition}</p>
          </div>
          <button className="text-blue-500 font-medium">查看展览</button>
        </div>
      </div>
    </div>;
}
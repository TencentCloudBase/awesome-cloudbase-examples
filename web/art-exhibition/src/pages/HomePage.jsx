// @ts-ignore;
import React, { useState, useEffect } from 'react';

import { ExhibitionCard } from '@/components/ExhibitionCard';
import { ArtworkCard } from '@/components/ArtworkCard';
import { TabBar } from '@/components/TabBar';
import { Navbar } from '@/components/Navbar';
export default function HomePage(props) {
  const [currentExhibitions] = useState([{
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
  }]);
  const [popularArtworks, setPopularArtworks] = useState([]);
  const [artworksLoading, setArtworksLoading] = useState(false);
  const [artworksError, setArtworksError] = useState(null);

  // 获取热门艺术品数据
  useEffect(() => {
    const fetchPopularArtworks = async () => {
      try {
        setArtworksLoading(true);
        setArtworksError(null);
        const result = await props.$w.cloud.callDataSource({
          dataSourceName: 'artwork',
          methodName: 'wedaGetRecordsV2',
          params: {
            pageSize: 4, // 只获取4个艺术品用于首页展示
            pageNumber: 1,
            select: {
              $master: true
            }
          }
        });
        setPopularArtworks(result.records || []);
      } catch (err) {
        console.error('获取艺术品数据失败:', err);
        setArtworksError(err.message);
        // 如果获取失败，使用默认数据
        setPopularArtworks([{
          id: 1,
          title: '星空',
          artist: '文森特·梵高',
          image: 'https://images.unsplash.com/photo-1579783902614-a3fb39268b5b'
        }, {
          id: 2,
          title: '蒙娜丽莎',
          artist: '列奥纳多·达·芬奇',
          image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19'
        }, {
          id: 3,
          title: '呐喊',
          artist: '爱德华·蒙克',
          image: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e'
        }, {
          id: 4,
          title: '戴珍珠耳环的少女',
          artist: '约翰内斯·维米尔',
          image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956'
        }]);
      } finally {
        setArtworksLoading(false);
      }
    };

    fetchPopularArtworks();
  }, []);

  const handleExhibitionClick = exhibitionId => {
    props.$w.utils.navigateTo({
      pageId: 'ExhibitionDetailPage',
      params: {
        id: exhibitionId
      }
    });
  };
  const navigateToArtworkDetail = id => {
    props.$w.utils.navigateTo({
      pageId: 'ArtworkDetailPage',
      params: {
        id
      }
    });
  };

  const navigateToArtworkSearch = () => {
    props.$w.utils.navigateTo({
      pageId: 'ArtworkSearchPage'
    });
  };

  const navigateToExhibitions = () => {
    props.$w.utils.navigateTo({
      pageId: 'ExhibitionsPage'
    });
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
    <Navbar title="艺术馆" />

    <main className="pb-20">
      {/* 当前展览 */}
      <section className="px-4 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">当前展览</h2>
          <button onClick={navigateToExhibitions} className="text-sm text-blue-500 hover:text-blue-600 transition-colors">查看全部</button>
        </div>

        <div className="flex overflow-x-auto space-x-4 pb-4 scroll-snap-type-x-mandatory">
          {currentExhibitions.map(exhibition => <div key={exhibition.id} className="flex-shrink-0 w-64 scroll-snap-align-start">
            <ExhibitionCard exhibition={exhibition} onClick={() => handleExhibitionClick(exhibition.id)} />
          </div>)}
        </div>
      </section>

      {/* 热门艺术品 */}
      <section className="px-4 pt-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">热门艺术品</h2>
          <button onClick={navigateToArtworkSearch} className="text-sm text-blue-500 hover:text-blue-600 transition-colors">查看全部</button>
        </div>

        {artworksLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse"></div>
            ))}
          </div>
        ) : artworksError ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">加载失败</p>
            <p className="text-sm text-gray-400">使用默认数据展示</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {popularArtworks.map(artwork => <ArtworkCard key={artwork.id} artwork={artwork} onClick={() => navigateToArtworkDetail(artwork.id)} />)}
          </div>
        )}
      </section>
    </main>

    <TabBar activeTab="home" />
  </div>;
}
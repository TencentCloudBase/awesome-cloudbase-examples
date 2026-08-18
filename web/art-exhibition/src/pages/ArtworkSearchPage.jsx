// @ts-ignore;
import React, { useState, useEffect } from 'react';

import { Navbar, TabBar } from '@/components';
import { ArtworkList } from '@/components/ArtworkList';

export default function ArtworkSearchPage(props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedArtworks, setDisplayedArtworks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true);
        const result = await props.$w.cloud.callDataSource({
          dataSourceName: 'artwork',
          methodName: 'wedaGetRecordsV2',
          params: {
            filter: {
              where: {
                $or: [{
                  title: {
                    $search: searchTerm
                  }
                }, {
                  artist: {
                    $search: searchTerm
                  }
                }]
              }
            },
            pageSize: 8,
            pageNumber: page,
            select: {
              $master: true
            }
          }
        });
        setDisplayedArtworks(prev => [...prev, ...result.records]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchArtworks();
  }, [searchTerm, page]);
  const loadMore = () => {
    setPage(prev => prev + 1);
  };
  return <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
      <Navbar title="艺术品搜索" />
      
      <main className="pb-20">
        <ArtworkList artworks={displayedArtworks} onSearch={setSearchTerm} loadMore={loadMore} loading={loading} />
        {error && <div className="text-red-500 px-4">{error}</div>}
      </main>

      <TabBar activeTab="search" />
    </div>;
}
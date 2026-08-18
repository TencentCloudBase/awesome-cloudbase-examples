// @ts-ignore;
import React, { useEffect, useRef } from 'react';
// @ts-ignore;
import { Input } from '@/components/ui';

import { ArtworkCard } from './ArtworkCard';
export function ArtworkList({
  artworks,
  onSearch,
  loadMore
}) {
  const containerRef = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, {
      threshold: 0.1
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);
  return <div className="space-y-4">
      <div className="px-4">
        <Input placeholder="搜索艺术品..." onChange={e => onSearch(e.target.value)} className="w-full rounded-3xl" />
      </div>
      
      <div className="grid grid-cols-2 gap-3 px-4">
        {artworks.map(artwork => <div key={artwork.id} className="break-inside-avoid">
            <ArtworkCard artwork={artwork} />
          </div>)}
      </div>
      
      <div ref={containerRef} className="h-10"></div>
    </div>;
}
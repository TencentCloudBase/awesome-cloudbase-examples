// @ts-ignore;
import React from 'react';

export function ArtworkCard({
  artwork,
  onClick
}) {
  return <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-[1.03] cursor-pointer" onClick={onClick}>
      <img src={artwork.image} alt={artwork.title} className="w-full h-40 object-cover" />
      <div className="p-3">
        <h3 className="font-medium text-gray-800">{artwork.title}</h3>
        <p className="text-xs text-gray-500">{artwork.artist}</p>
      </div>
    </div>;
}
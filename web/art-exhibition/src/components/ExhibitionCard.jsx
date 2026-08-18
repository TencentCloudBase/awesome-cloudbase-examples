// @ts-ignore;
import React from 'react';

export function ExhibitionCard({
  exhibition,
  onClick
}) {
  const handleClick = () => {
    onClick?.(exhibition.id); // 传递展览ID作为参数
  };
  return <div className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:translate-y-[-2px] cursor-pointer" onClick={handleClick}>
      <img src={exhibition.image} alt={exhibition.title} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="font-medium text-gray-800">{exhibition.title}</h3>
        <p className="text-xs text-gray-500 mt-1">{exhibition.date}</p>
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{exhibition.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{exhibition.location}</span>
          <button className="text-blue-500 text-sm font-medium" onClick={e => {
          e.stopPropagation();
          handleClick();
        }}>查看详情</button>
        </div>
      </div>
    </div>;
}
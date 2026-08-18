// @ts-ignore;
import React from 'react';
// @ts-ignore;
import { Search } from 'lucide-react';

export function Navbar({
  title,
  showSearch = true
}) {
  return <header className="sticky top-0 z-10 bg-white shadow-sm p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {showSearch && <button className="text-gray-600">
            <Search className="w-5 h-5" />
          </button>}
      </div>
    </header>;
}
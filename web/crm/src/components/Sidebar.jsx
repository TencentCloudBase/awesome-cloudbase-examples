import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', icon: '◆', label: 'Dashboard', color: '#FF6B35' },
    { path: '/customers', icon: '●', label: 'Customers', color: '#004E89' },
    { path: '/opportunities', icon: '■', label: 'Opportunities', color: '#1A535C' },
    { path: '/contacts', icon: '▲', label: 'Contacts', color: '#F7B801' },
  ];

  return (
    <motion.aside 
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="w-64 bg-black text-white min-h-screen border-r-4 border-white fixed left-0 top-0 z-50"
    >
      <div className="p-8">
        <h1 className="text-3xl font-black mb-12 tracking-tighter">
          <span className="block text-white">CRM</span>
          <span className="block text-xs text-gray-400 mt-2 font-light tracking-wider">SYSTEM V2.0</span>
        </h1>
        
        <nav className="space-y-2">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-none
                    transition-all duration-200 group
                    ${isActive 
                      ? 'bg-white text-black font-bold' 
                      : 'hover:bg-gray-900 text-gray-300 hover:text-white'
                    }
                  `}
                >
                  <span 
                    className="text-2xl transition-transform group-hover:scale-125"
                    style={{ color: isActive ? item.color : 'currentColor' }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm uppercase tracking-wider font-medium">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>
      
      <div className="absolute bottom-8 left-8 right-8">
        <div className="border-t-2 border-gray-800 pt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            CloudBase CRM
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Powered by AI
          </p>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

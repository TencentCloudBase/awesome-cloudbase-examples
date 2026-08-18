import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, change, icon, color, index = 0 }) => {
  const isPositive = change > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border-4 border-black p-6 relative overflow-hidden group hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
    >
      {/* Background accent */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 opacity-5 transform rotate-12 translate-x-8 -translate-y-8"
        style={{ backgroundColor: color }}
      >
        <span className="text-9xl">{icon}</span>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-600 font-bold">
            {title}
          </h3>
          <span className="text-3xl" style={{ color }}>
            {icon}
          </span>
        </div>
        
        <div className="mb-2">
          <p className="text-4xl font-black tracking-tighter">
            {value}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span 
            className={`text-xs font-bold uppercase px-2 py-1 ${
              isPositive 
                ? 'bg-black text-white' 
                : 'bg-red-600 text-white'
            }`}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          <span className="text-xs text-gray-500 uppercase">vs last month</span>
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;

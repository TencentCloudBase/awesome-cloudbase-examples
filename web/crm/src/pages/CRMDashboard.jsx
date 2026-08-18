import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import { app, ensureLogin } from '../utils/cloudbase';

const CRMDashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    opportunities: 0,
    contacts: 0,
    revenue: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      
      const [customersRes, opportunitiesRes, contactsRes] = await Promise.all([
        db.collection('crm_customers').count(),
        db.collection('crm_opportunities').count(),
        db.collection('crm_contacts').count()
      ]);

      setStats({
        customers: customersRes.total,
        opportunities: opportunitiesRes.total,
        contacts: contactsRes.total,
        revenue: 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-black text-white p-8 border-b-4 border-white"
      >
        <div className="max-w-7xl mx-auto">
          <h1 className="text-6xl font-black tracking-tighter mb-2">
            DASHBOARD
          </h1>
          <p className="text-gray-400 uppercase text-sm tracking-wider">
            Real-time business intelligence
          </p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Total Customers"
            value={stats.customers}
            change={12.5}
            icon="●"
            color="#004E89"
            index={0}
          />
          <StatCard
            title="Active Opportunities"
            value={stats.opportunities}
            change={8.3}
            icon="■"
            color="#1A535C"
            index={1}
          />
          <StatCard
            title="Contacts"
            value={stats.contacts}
            change={-2.1}
            icon="▲"
            color="#F7B801"
            index={2}
          />
          <StatCard
            title="Revenue (¥)"
            value={stats.revenue.toLocaleString()}
            change={15.7}
            icon="◆"
            color="#FF6B35"
            index={3}
          />
        </div>

        {/* Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border-4 border-black p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              Recent Activity
            </h2>
            <button className="bg-black text-white px-6 py-2 text-xs uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { type: 'customer', action: 'New customer added', time: '2 hours ago', color: '#004E89' },
              { type: 'opportunity', action: 'Deal closed', time: '5 hours ago', color: '#1A535C' },
              { type: 'contact', action: 'Contact updated', time: '1 day ago', color: '#F7B801' },
            ].map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-4 p-4 border-2 border-gray-200 hover:border-black transition-colors"
              >
                <div 
                  className="w-12 h-12 flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: activity.color }}
                >
                  {activity.type[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{activity.action}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">{activity.time}</p>
                </div>
                <button className="text-black hover:underline text-xs font-bold uppercase">
                  View →
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CRMDashboard;

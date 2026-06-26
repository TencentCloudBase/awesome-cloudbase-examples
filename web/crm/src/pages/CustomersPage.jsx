import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { app, ensureLogin } from '../utils/cloudbase';

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'active',
    industry: '',
    value: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      const res = await db.collection('crm_customers').get();
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('crm_customers').add({
        ...formData,
        value: parseFloat(formData.value) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setShowModal(false);
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        status: 'active',
        industry: '',
        value: ''
      });
      loadCustomers();
    } catch (error) {
      console.error('Failed to add customer:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#1A535C',
      inactive: '#F7B801',
      prospect: '#FF6B35'
    };
    return colors[status] || '#004E89';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-black text-white p-8 border-b-4 border-white"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-6xl font-black tracking-tighter mb-2">
              CUSTOMERS
            </h1>
            <p className="text-gray-400 uppercase text-sm tracking-wider">
              Manage your customer base
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-black px-8 py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-200 transition-colors border-4 border-white"
          >
            + Add Customer
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : customers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-4 border-black p-12 text-center"
          >
            <p className="text-2xl font-black mb-4">NO CUSTOMERS YET</p>
            <p className="text-gray-500 mb-6">Start by adding your first customer</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-8 py-3 text-sm uppercase font-bold"
            >
              Add Customer
            </button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {customers.map((customer, index) => (
              <motion.div
                key={customer._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/customers/${customer._id}`)}
                className="bg-white border-4 border-black p-6 cursor-pointer hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-2xl font-black tracking-tight">
                        {customer.name}
                      </h3>
                      <span
                        className="px-3 py-1 text-xs font-bold uppercase text-white"
                        style={{ backgroundColor: getStatusColor(customer.status) }}
                      >
                        {customer.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Company</p>
                        <p className="font-bold">{customer.company}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Industry</p>
                        <p className="font-bold">{customer.industry || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Email</p>
                        <p className="font-mono text-xs">{customer.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Phone</p>
                        <p className="font-mono text-xs">{customer.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 uppercase text-xs tracking-wider mb-1">Value</p>
                    <p className="text-3xl font-black">¥{(customer.value || 0).toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-4 border-black p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black uppercase">Add Customer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-3xl font-bold hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold mb-2">
                  Estimated Value (¥)
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full border-2 border-black p-3 focus:outline-none focus:border-4"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-800 transition-colors"
                >
                  Add Customer
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-black py-4 text-sm uppercase tracking-wider font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;

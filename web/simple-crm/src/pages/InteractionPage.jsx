import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import InteractionList from '../components/InteractionList';
import InteractionForm from '../components/InteractionForm';
import cloudbase from '../utils/cloudbase';

const InteractionPage = () => {
  const [interactions, setInteractions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    customerId: '',
    type: '',
    followUpStatus: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // 互动类型选项
  const interactionTypes = [
    { value: '', label: '全部类型' },
    { value: '电话', label: '电话' },
    { value: '邮件', label: '邮件' },
    { value: '会议', label: '会议' },
    { value: '其他', label: '其他' }
  ];

  // 跟进状态选项
  const followUpStatusOptions = [
    { value: '', label: '全部状态' },
    { value: '初步接触', label: '初步接触' },
    { value: '需求确认', label: '需求确认' },
    { value: '方案制定', label: '方案制定' },
    { value: '合同谈判', label: '合同谈判' },
    { value: '成交', label: '成交' },
    { value: '暂停跟进', label: '暂停跟进' }
  ];

  useEffect(() => {
    loadData();
  }, [pagination.page, filters]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await cloudbase.app.callFunction({
        name: 'dx_interaction',
        data: {
          action: 'list',
          data: {
            page: pagination.page,
            limit: pagination.limit,
            ...filters
          }
        }
      });

      if (result.result.success) {
        setInteractions(result.result.data.list);
        setPagination(prev => ({
          ...prev,
          total: result.result.data.total,
          totalPages: result.result.data.totalPages
        }));
      } else {
        console.error('加载互动记录失败:', result.result.error);
      }
    } catch (error) {
      console.error('加载互动记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const result = await cloudbase.app.callFunction({
        name: 'dx_customer',
        data: {
          action: 'list',
          data: {
            page: 1,
            limit: 1000 // 获取所有客户用于下拉选择
          }
        }
      });

      if (result.result.success) {
        setCustomers(result.result.data.list);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    }
  };

  const handleCreateInteraction = () => {
    setEditingInteraction(null);
    setShowForm(true);
  };

  const handleEditInteraction = (interaction) => {
    setEditingInteraction(interaction);
    setShowForm(true);
  };

  const handleDeleteInteraction = async (id) => {
    if (!confirm('确定要删除这条互动记录吗？')) {
      return;
    }

    try {
      const result = await cloudbase.app.callFunction({
        name: 'dx_interaction',
        data: {
          action: 'delete',
          data: { id }
        }
      });

      if (result.result.success) {
        await loadData();
      } else {
        alert('删除失败: ' + result.result.error);
      }
    } catch (error) {
      console.error('删除互动记录失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const action = editingInteraction ? 'update' : 'create';
      const data = editingInteraction 
        ? { id: editingInteraction._id, ...formData }
        : formData;

      const result = await cloudbase.app.callFunction({
        name: 'dx_interaction',
        data: {
          action,
          data
        }
      });

      if (result.result.success) {
        setShowForm(false);
        setEditingInteraction(null);
        await loadData();
      } else {
        alert('保存失败: ' + result.result.error);
      }
    } catch (error) {
      console.error('保存互动记录失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">互动记录</h1>
                <p className="text-gray-600">管理客户沟通历史和跟进状态</p>
              </div>
            </div>
            
            <button
              onClick={handleCreateInteraction}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-5 h-5" />
              <span>新增记录</span>
            </button>
          </div>
        </motion.div>

        {/* 搜索和筛选 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 客户筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                客户筛选
              </label>
              <select
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">全部客户</option>
                {customers.map(customer => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 类型筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                互动类型
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {interactionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                跟进状态
              </label>
              <select
                value={filters.followUpStatus}
                onChange={(e) => handleFilterChange('followUpStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {followUpStatusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 清空筛选 */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ customerId: '', type: '', followUpStatus: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                清空筛选
              </button>
            </div>
          </div>
        </motion.div>

        {/* 互动记录列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InteractionList
            interactions={interactions}
            customers={customers}
            loading={loading}
            pagination={pagination}
            onEdit={handleEditInteraction}
            onDelete={handleDeleteInteraction}
            onPageChange={handlePageChange}
          />
        </motion.div>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <InteractionForm
          interaction={editingInteraction}
          customers={customers}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingInteraction(null);
          }}
        />
      )}
    </div>
  );
};

export default InteractionPage;

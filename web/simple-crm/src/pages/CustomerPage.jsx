import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Navbar from '../components/Navbar';
import CustomerForm from '../components/CustomerForm';
import CustomerList from '../components/CustomerList';
import cloudbase from '../utils/cloudbase';

const CustomerPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // 加载客户列表
  const loadCustomers = async (page = 1, keyword = '') => {
    try {
      setLoading(true);
      const result = await cloudbase.app.callFunction({
        name: 'dx_customer',
        data: {
          action: 'list',
          data: {
            page,
            limit: pagination.limit,
            keyword
          }
        }
      });

      if (result.result.success) {
        setCustomers(result.result.data.list);
        setPagination({
          page: result.result.data.page,
          limit: result.result.data.limit,
          total: result.result.data.total,
          totalPages: result.result.data.totalPages
        });
      } else {
        console.error('加载客户列表失败:', result.result.error);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // 搜索处理
  const handleSearch = () => {
    loadCustomers(1, searchKeyword);
  };

  // 新增客户
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  // 编辑客户
  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  // 保存客户
  const handleSaveCustomer = async (formData) => {
    try {
      setFormLoading(true);
      const action = editingCustomer ? 'update' : 'create';
      const data = editingCustomer 
        ? { id: editingCustomer._id, ...formData }
        : formData;

      const result = await cloudbase.app.callFunction({
        name: 'dx_customer',
        data: {
          action,
          data
        }
      });

      if (result.result.success) {
        setShowForm(false);
        setEditingCustomer(null);
        loadCustomers(pagination.page, searchKeyword);
      } else {
        alert(result.result.error || '操作失败');
      }
    } catch (error) {
      console.error('保存客户失败:', error);
      alert('保存失败，请重试');
    } finally {
      setFormLoading(false);
    }
  };

  // 删除客户确认
  const handleDeleteCustomer = (customer) => {
    setDeletingCustomer(customer);
    setShowDeleteConfirm(true);
  };

  // 确认删除
  const confirmDelete = async () => {
    try {
      const result = await cloudbase.app.callFunction({
        name: 'dx_customer',
        data: {
          action: 'delete',
          data: { id: deletingCustomer._id }
        }
      });

      if (result.result.success) {
        setShowDeleteConfirm(false);
        setDeletingCustomer(null);
        loadCustomers(pagination.page, searchKeyword);
      } else {
        alert(result.result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除客户失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 分页处理
  const handlePageChange = (newPage) => {
    loadCustomers(newPage, searchKeyword);
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
          <div className="flex items-center space-x-3 mb-2">
            <UserGroupIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
          </div>
          <p className="text-gray-600">管理您的客户信息，包括联系方式、公司信息等</p>
        </motion.div>

        {/* 操作栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* 搜索框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索客户姓名、电话或公司..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={handleSearch}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                搜索
              </button>
              <button
                onClick={handleAddCustomer}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>新增客户</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">客户总数</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">当前页面</p>
              <p className="text-lg font-semibold text-gray-900">
                {pagination.page} / {pagination.totalPages || 1}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 客户列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CustomerList
            customers={customers}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
            loading={loading}
          />
        </motion.div>

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex justify-center"
          >
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              {[...Array(pagination.totalPages)].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      page === pagination.page
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* 客户表单弹窗 */}
      <AnimatePresence>
        {showForm && (
          <CustomerForm
            customer={editingCustomer}
            onSave={handleSaveCustomer}
            onCancel={() => {
              setShowForm(false);
              setEditingCustomer(null);
            }}
            loading={formLoading}
          />
        )}
      </AnimatePresence>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                确定要删除客户 "{deletingCustomer?.name}" 吗？此操作无法撤销。
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingCustomer(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerPage;

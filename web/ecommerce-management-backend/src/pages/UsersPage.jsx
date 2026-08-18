import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { app, ensureLogin } from '../utils/cloudbase';
import { useDebounce } from '../hooks/useDebounce';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 使用防抖，延迟500ms执行搜索
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showModal, setShowModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    grade: 'bronze'
  });

  const pageSize = 10;
  const gradeLabels = {
    bronze: '铜牌会员',
    silver: '银牌会员',
    gold: '金牌会员'
  };

  const gradeColors = {
    bronze: 'bg-orange-100 text-orange-800',
    silver: 'bg-gray-100 text-gray-800',
    gold: 'bg-yellow-100 text-yellow-800'
  };

  // 获取会员列表
  const fetchUsers = async (page = 1, search = '') => {
    try {
      // 首次加载显示全屏loading，搜索时显示搜索loading
      if (users.length === 0) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      await ensureLogin();
      const db = app.database();
      
      let query = db.collection('user');
      
      if (search) {
        query = query.where({
          name: db.RegExp({
            regexp: search,
            options: 'i'
          })
        });
      }
      
      const countResult = await query.count();
      const total = countResult.total;
      setTotalPages(Math.ceil(total / pageSize));
      
      const result = await query
        .orderBy('createTime', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get();
      
      setUsers(result.data);
    } catch (error) {
      console.error('获取会员列表失败:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm]);

  // 搜索处理
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // 打开新增/编辑模态框
  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        id: item.id,
        name: item.name,
        grade: item.grade
      });
    } else {
      setEditingItem(null);
      setFormData({
        id: '',
        name: '',
        grade: 'bronze'
      });
    }
    setShowModal(true);
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // 处理表单输入
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 保存会员
  const saveUser = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      
      const userData = {
        ...formData,
        updateTime: new Date()
      };

      if (editingItem) {
        // 更新
        await db.collection('user').doc(editingItem._id).update(userData);
      } else {
        // 新增
        userData.createTime = new Date();
        userData.orderIds = [];
        await db.collection('user').add(userData);
      }
      
      closeModal();
      fetchUsers(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('保存会员失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除会员
  const deleteUser = async (id) => {
    if (!confirm('确定要删除这个会员吗？')) return;
    
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('user').doc(id).remove();
      fetchUsers(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('删除会员失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 查看会员订单
  const viewUserOrders = async (userId) => {
    try {
      await ensureLogin();
      const db = app.database();
      
      const result = await db.collection('order')
        .where({
          userId: userId
        })
        .orderBy('createTime', 'desc')
        .get();
      
      setUserOrders(result.data);
      setShowOrderModal(true);
    } catch (error) {
      console.error('获取会员订单失败:', error);
      alert('获取订单失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 演示提示 */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>🎯 <strong>演示模式</strong>：这是一个展示项目，所有操作按钮已被禁用以防止数据被修改。您可以浏览查看所有功能界面。</span>
      </div>

      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">会员管理</h1>
        <button
          onClick={() => openModal()}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新增会员
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会员名称..."
            value={searchTerm}
            onChange={handleSearch}
            className="input input-bordered w-full pl-10"
          />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="loading loading-spinner loading-sm"></div>
            </div>
          )}
        </div>
      </div>

      {/* 会员列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会员信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会员等级
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                注册时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((item) => (
              <tr key={item._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">ID: {item.id}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${gradeColors[item.grade]}`}>
                    {gradeLabels[item.grade]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(item.createTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => viewUserOrders(item.id)}
                    className="text-green-600 hover:text-green-900"
                    title="查看订单"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openModal(item)}
                    className="text-blue-600 hover:text-blue-900"
                    title="编辑"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <div className="tooltip" data-tip="演示模式：删除已禁用">
                    <button
                      disabled
                      className="text-gray-400 cursor-not-allowed"
                      title="删除"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex justify-center">
        <div className="join">
          <button
            className="join-item btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            上一页
          </button>
          <button className="join-item btn btn-active">
            {currentPage} / {totalPages}
          </button>
          <button
            className="join-item btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            下一页
          </button>
        </div>
      </div>

      {/* 新增/编辑模态框 */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingItem ? '编辑会员' : '新增会员'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">会员ID</span>
                </label>
                <input
                  type="text"
                  name="id"
                  value={formData.id}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="会员ID"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">会员名称</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="会员名称"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">会员等级</span>
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                >
                  <option value="bronze">铜牌会员</option>
                  <option value="silver">银牌会员</option>
                  <option value="gold">金牌会员</option>
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button onClick={closeModal} className="btn">
                取消
              </button>
              <div className="tooltip tooltip-left" data-tip="演示模式：保存功能已禁用，您可以体验表单填写但无法保存数据">
                <button disabled className="btn btn-primary btn-disabled">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 会员订单模态框 */}
      {showOrderModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-4">会员订单</h3>
            
            {userOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>订单ID</th>
                      <th>商品SKU</th>
                      <th>数量</th>
                      <th>总价</th>
                      <th>状态</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map((order) => (
                      <tr key={order._id}>
                        <td>{order.id}</td>
                        <td>{order.goodsSku}</td>
                        <td>{order.num}</td>
                        <td>¥{order.totalPrice}</td>
                        <td>
                          <span className={`badge ${
                            order.status === 'completed' ? 'badge-success' :
                            order.status === 'shipped' ? 'badge-info' :
                            order.status === 'pending' ? 'badge-warning' :
                            'badge-error'
                          }`}>
                            {order.status === 'completed' ? '已完成' :
                             order.status === 'shipped' ? '已发货' :
                             order.status === 'pending' ? '待发货' :
                             '已退款'}
                          </span>
                        </td>
                        <td>{new Date(order.createTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                该会员暂无订单
              </div>
            )}

            <div className="modal-action">
              <button onClick={() => setShowOrderModal(false)} className="btn">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

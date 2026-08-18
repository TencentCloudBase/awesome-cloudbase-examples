import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { app, ensureLogin } from '../utils/cloudbase';
import { useDebounce } from '../hooks/useDebounce';

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 使用防抖，延迟500ms执行搜索
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    multiPrize: '',
    lowestPrice: ''
  });

  const pageSize = 10;

  // 获取活动状态
  const getPromotionStatus = (startTime, endTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (now < start) {
      return { status: 'inactive', label: '未开始', color: 'badge-warning' };
    } else if (now > end) {
      return { status: 'expired', label: '已结束', color: 'badge-error' };
    } else {
      return { status: 'active', label: '进行中', color: 'badge-success' };
    }
  };

  // 获取促销活动列表
  const fetchPromotions = async (page = 1, search = '') => {
    try {
      // 首次加载显示全屏loading，搜索时显示搜索loading
      if (promotions.length === 0) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      await ensureLogin();
      const db = app.database();
      
      let query = db.collection('salesPromotion');
      
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
      
      setPromotions(result.data);
    } catch (error) {
      console.error('获取促销活动列表失败:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions(currentPage, debouncedSearchTerm);
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
        description: item.description,
        startTime: new Date(item.startTime).toISOString().slice(0, 16),
        endTime: new Date(item.endTime).toISOString().slice(0, 16),
        multiPrize: item.multiPrize,
        lowestPrice: item.lowestPrice
      });
    } else {
      setEditingItem(null);
      setFormData({
        id: '',
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        multiPrize: '',
        lowestPrice: ''
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

  // 保存促销活动
  const savePromotion = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      
      const promotionData = {
        ...formData,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        multiPrize: parseFloat(formData.multiPrize),
        lowestPrice: parseFloat(formData.lowestPrice),
        updateTime: new Date()
      };

      if (editingItem) {
        // 更新
        await db.collection('salesPromotion').doc(editingItem._id).update(promotionData);
      } else {
        // 新增
        promotionData.createTime = new Date();
        await db.collection('salesPromotion').add(promotionData);
      }
      
      closeModal();
      fetchPromotions(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('保存促销活动失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除促销活动
  const deletePromotion = async (id) => {
    if (!confirm('确定要删除这个促销活动吗？')) return;
    
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('salesPromotion').doc(id).remove();
      fetchPromotions(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('删除促销活动失败:', error);
      alert('删除失败，请重试');
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
        <h1 className="text-2xl font-bold text-gray-900">促销活动管理</h1>
        <button
          onClick={() => openModal()}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新增活动
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索活动名称..."
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

      {/* 促销活动列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                活动信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                优惠规则
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                活动时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {promotions.map((item) => {
              const statusInfo = getPromotionStatus(item.startTime, item.endTime);
              return (
                <tr key={item._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">ID: {item.id}</div>
                      <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">减免: ¥{item.multiPrize}</div>
                      <div className="text-sm text-gray-500">门槛: ¥{item.lowestPrice}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">
                        开始: {new Date(item.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        结束: {new Date(item.endTime).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
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
              );
            })}
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
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingItem ? '编辑促销活动' : '新增促销活动'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">活动ID</span>
                  </label>
                  <input
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="活动ID"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">活动名称</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="活动名称"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">活动描述</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full"
                  placeholder="活动规则描述"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">开始时间</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">结束时间</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">减免金额</span>
                  </label>
                  <input
                    type="number"
                    name="multiPrize"
                    value={formData.multiPrize}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="减免金额"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">最低消费门槛</span>
                  </label>
                  <input
                    type="number"
                    name="lowestPrice"
                    value={formData.lowestPrice}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="最低消费门槛"
                    step="0.01"
                  />
                </div>
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
    </div>
  );
};

export default PromotionsPage;

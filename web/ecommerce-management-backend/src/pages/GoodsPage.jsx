import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { app, ensureLogin } from '../utils/cloudbase';
import { useDebounce } from '../hooks/useDebounce';

const GoodsPage = () => {
  const [goods, setGoods] = useState([]);
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
    sku: '',
    goodName: '',
    price: '',
    description: '',
    stock: '',
    picture: [''],
    status: 'online'
  });

  const pageSize = 10;

  // 获取商品列表
  const fetchGoods = async (page = 1, search = '') => {
    try {
      // 首次加载显示全屏loading，搜索时显示搜索loading
      if (goods.length === 0) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      await ensureLogin();
      const db = app.database();
      
      let query = db.collection('goods');
      
      if (search) {
        query = query.where({
          goodName: db.RegExp({
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
      
      setGoods(result.data);
    } catch (error) {
      console.error('获取商品列表失败:', error);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchGoods(currentPage, debouncedSearchTerm);
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
        sku: item.sku,
        goodName: item.goodName,
        price: item.price,
        description: item.description,
        stock: item.stock,
        picture: item.picture || [''],
        status: item.status
      });
    } else {
      setEditingItem(null);
      setFormData({
        sku: '',
        goodName: '',
        price: '',
        description: '',
        stock: '',
        picture: [''],
        status: 'online'
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

  // 处理图片URL输入
  const handlePictureChange = (index, value) => {
    const newPictures = [...formData.picture];
    newPictures[index] = value;
    setFormData(prev => ({
      ...prev,
      picture: newPictures
    }));
  };

  // 添加图片URL输入框
  const addPictureInput = () => {
    setFormData(prev => ({
      ...prev,
      picture: [...prev.picture, '']
    }));
  };

  // 删除图片URL输入框
  const removePictureInput = (index) => {
    const newPictures = formData.picture.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      picture: newPictures.length > 0 ? newPictures : ['']
    }));
  };

  // 保存商品
  const saveGoods = async () => {
    try {
      await ensureLogin();
      const db = app.database();
      
      const goodsData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        picture: formData.picture.filter(url => url.trim() !== ''),
        updateTime: new Date()
      };

      if (editingItem) {
        // 更新
        await db.collection('goods').doc(editingItem._id).update(goodsData);
      } else {
        // 新增
        goodsData.createTime = new Date();
        await db.collection('goods').add(goodsData);
      }
      
      closeModal();
      fetchGoods(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('保存商品失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除商品
  const deleteGoods = async (id) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    
    try {
      await ensureLogin();
      const db = app.database();
      await db.collection('goods').doc(id).remove();
      fetchGoods(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('删除商品失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 切换商品状态
  const toggleStatus = async (item) => {
    try {
      await ensureLogin();
      const db = app.database();
      const newStatus = item.status === 'online' ? 'offline' : 'online';
      await db.collection('goods').doc(item._id).update({
        status: newStatus,
        updateTime: new Date()
      });
      fetchGoods(currentPage, debouncedSearchTerm);
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      {/* 演示提示 */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>🎯 <strong>演示模式</strong>：您可以体验完整的操作流程（新增、编辑表单），但保存功能已禁用以保护演示数据。删除操作已完全禁用。</span>
      </div>

      {/* 首次加载的全屏loading */}
      {loading && goods.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : (
        <>
          {/* 页面标题和操作栏 */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
            <button
              onClick={() => openModal()}
              className="btn btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              新增商品
            </button>
          </div>

          {/* 搜索栏 */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索商品名称..."
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

          {/* 商品列表 */}
          <div className="bg-white shadow rounded-lg overflow-hidden relative">
            {searchLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="loading loading-spinner loading-md"></div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                商品信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                价格
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                库存
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
            {goods.map((item) => (
              <tr key={item._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-16 w-16">
                      {item.picture && item.picture[0] ? (
                        <img
                          className="h-16 w-16 rounded-lg object-cover"
                          src={item.picture[0]}
                          alt={item.goodName}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">无图片</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{item.goodName}</div>
                      <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ¥{item.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.stock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="tooltip" data-tip="演示模式：操作已禁用">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-not-allowed opacity-60 ${
                        item.status === 'online'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.status === 'online' ? '上架' : '下架'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => openModal(item)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <div className="tooltip" data-tip="演示模式：删除已禁用">
                    <button
                      disabled
                      className="text-gray-400 cursor-not-allowed"
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
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingItem ? '编辑商品' : '新增商品'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">SKU</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="商品SKU"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">商品名称</span>
                  </label>
                  <input
                    type="text"
                    name="goodName"
                    value={formData.goodName}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="商品名称"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">价格</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="商品价格"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">库存</span>
                  </label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="input input-bordered w-full"
                    placeholder="库存数量"
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">商品描述</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="textarea textarea-bordered w-full"
                  placeholder="商品描述"
                  rows="3"
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">商品图片</span>
                </label>
                {formData.picture.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handlePictureChange(index, e.target.value)}
                      className="input input-bordered flex-1"
                      placeholder="图片URL"
                    />
                    {formData.picture.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePictureInput(index)}
                        className="btn btn-sm btn-error"
                      >
                        删除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPictureInput}
                  className="btn btn-sm btn-outline"
                >
                  添加图片
                </button>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">状态</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                >
                  <option value="online">上架</option>
                  <option value="offline">下架</option>
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
        </>
      )}
    </div>
  );
};

export default GoodsPage;

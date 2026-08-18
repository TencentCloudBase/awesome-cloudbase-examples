import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

const InteractionForm = ({ interaction, customers, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    type: '电话',
    content: '',
    followUpStatus: '初步接触',
    nextFollowUp: ''
  });
  const [loading, setLoading] = useState(false);

  // 互动类型选项
  const interactionTypes = [
    { value: '电话', label: '电话' },
    { value: '邮件', label: '邮件' },
    { value: '会议', label: '会议' },
    { value: '其他', label: '其他' }
  ];

  // 跟进状态选项
  const followUpStatusOptions = [
    { value: '初步接触', label: '初步接触' },
    { value: '需求确认', label: '需求确认' },
    { value: '方案制定', label: '方案制定' },
    { value: '合同谈判', label: '合同谈判' },
    { value: '成交', label: '成交' },
    { value: '暂停跟进', label: '暂停跟进' }
  ];

  useEffect(() => {
    if (interaction) {
      // 编辑模式，填充现有数据
      setFormData({
        customerId: interaction.customerId || '',
        type: interaction.type || '电话',
        content: interaction.content || '',
        followUpStatus: interaction.followUpStatus || '初步接触',
        nextFollowUp: interaction.nextFollowUp 
          ? new Date(interaction.nextFollowUp).toISOString().split('T')[0]
          : ''
      });
    } else {
      // 新增模式，重置表单
      setFormData({
        customerId: '',
        type: '电话',
        content: '',
        followUpStatus: '初步接触',
        nextFollowUp: ''
      });
    }
  }, [interaction]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 表单验证
    if (!formData.customerId) {
      alert('请选择客户');
      return;
    }
    
    if (!formData.content.trim()) {
      alert('请输入互动内容');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        content: formData.content.trim(),
        nextFollowUp: formData.nextFollowUp || null
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('提交表单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* 表单头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {interaction ? '编辑互动记录' : '新增互动记录'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 客户选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              客户 <span className="text-red-500">*</span>
            </label>
            <select
              name="customerId"
              value={formData.customerId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">请选择客户</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name} - {customer.company || '无公司信息'}
                </option>
              ))}
            </select>
          </div>

          {/* 互动类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              互动类型 <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {interactionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* 互动内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              互动内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={4}
              placeholder="请详细描述本次互动的内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 跟进状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              跟进状态
            </label>
            <select
              name="followUpStatus"
              value={formData.followUpStatus}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {followUpStatusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* 下次跟进时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              下次跟进时间
            </label>
            <input
              type="date"
              name="nextFollowUp"
              value={formData.nextFollowUp}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* 表单按钮 */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>{loading ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default InteractionForm;

import { motion } from 'framer-motion';
import {
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import CustomerStatusBadge from './CustomerStatusBadge';

const InteractionList = ({
  interactions,
  customers,
  loading,
  pagination,
  onEdit,
  onDelete,
  onPageChange
}) => {
  // 获取互动类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case '电话':
        return <PhoneIcon className="w-5 h-5" />;
      case '邮件':
        return <EnvelopeIcon className="w-5 h-5" />;
      case '会议':
        return <UserGroupIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  // 获取互动类型颜色
  const getTypeColor = (type) => {
    switch (type) {
      case '电话':
        return 'bg-blue-100 text-blue-800';
      case '邮件':
        return 'bg-green-100 text-green-800';
      case '会议':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化日期（仅日期）
  const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="ml-2">加载中...</p>
        </div>
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无互动记录</h3>
          <p className="text-gray-500">点击"新增记录"按钮创建第一条互动记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 表格头部 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-2">客户</div>
          <div className="col-span-1">类型</div>
          <div className="col-span-3">内容</div>
          <div className="col-span-2">跟进状态</div>
          <div className="col-span-2">创建时间</div>
          <div className="col-span-1">下次跟进</div>
          <div className="col-span-1">操作</div>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="divide-y divide-gray-200">
        {interactions.map((interaction, index) => (
          <motion.div
            key={interaction._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* 客户名称 */}
              <div className="col-span-2">
                <div className="font-medium text-gray-900">
                  {interaction.customerName}
                </div>
              </div>

              {/* 互动类型 */}
              <div className="col-span-1">
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(interaction.type)}`}>
                  {getTypeIcon(interaction.type)}
                  <span>{interaction.type}</span>
                </div>
              </div>

              {/* 内容 */}
              <div className="col-span-3">
                <p className="text-sm text-gray-900 line-clamp-2">
                  {interaction.content}
                </p>
              </div>

              {/* 跟进状态 */}
              <div className="col-span-2">
                <CustomerStatusBadge status={interaction.followUpStatus} />
              </div>

              {/* 创建时间 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatDate(interaction.createTime)}</span>
                </div>
              </div>

              {/* 下次跟进 */}
              <div className="col-span-1">
                <div className="text-sm text-gray-500">
                  {interaction.nextFollowUp ? (
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDateOnly(interaction.nextFollowUp)}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="col-span-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(interaction)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    title="编辑"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(interaction._id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              {/* 页码按钮 */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      pageNum === pagination.page
                        ? 'bg-green-500 text-white border-green-500'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractionList;

const CustomerStatusBadge = ({ status }) => {
  // 获取状态对应的样式
  const getStatusStyle = (status) => {
    switch (status) {
      case '初步接触':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '需求确认':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '方案制定':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '合同谈判':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '成交':
        return 'bg-green-100 text-green-800 border-green-200';
      case '暂停跟进':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 获取状态对应的图标
  const getStatusIcon = (status) => {
    switch (status) {
      case '初步接触':
        return '👋';
      case '需求确认':
        return '🔍';
      case '方案制定':
        return '📋';
      case '合同谈判':
        return '💼';
      case '成交':
        return '✅';
      case '暂停跟进':
        return '⏸️';
      default:
        return '📝';
    }
  };

  if (!status) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        <span>📝</span>
        <span>未设置</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
      <span>{getStatusIcon(status)}</span>
      <span>{status}</span>
    </span>
  );
};

export default CustomerStatusBadge;

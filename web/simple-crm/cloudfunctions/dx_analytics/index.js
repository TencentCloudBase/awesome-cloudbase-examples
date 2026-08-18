const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const customerCollection = db.collection('dx_customers');
const interactionCollection = db.collection('dx_interactions');

/**
 * 数据分析云函数
 * 提供各种统计数据用于可视化展示
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event;

  try {
    switch (action) {
      case 'getCustomerGrowthTrend':
        return await getCustomerGrowthTrend(data);
      case 'getIndustryDistribution':
        return await getIndustryDistribution(data);
      case 'getInteractionStats':
        return await getInteractionStats(data);
      case 'getFollowUpStatusDistribution':
        return await getFollowUpStatusDistribution(data);
      case 'getDashboardOverview':
        return await getDashboardOverview(data);
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        };
    }
  } catch (error) {
    console.error('数据分析云函数执行错误:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

/**
 * 获取客户增长趋势
 */
async function getCustomerGrowthTrend(data) {
  const { period = 'month', limit = 12 } = data;
  
  try {
    // 获取所有客户数据
    const customers = await customerCollection
      .orderBy('createTime', 'asc')
      .get();

    if (customers.data.length === 0) {
      return {
        success: true,
        data: {
          labels: [],
          datasets: [{
            label: '客户数量',
            data: [],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          }]
        }
      };
    }

    // 按时间分组统计
    const groupedData = {};
    const now = new Date();
    
    customers.data.forEach(customer => {
      const createTime = new Date(customer.createTime);
      let key;
      
      if (period === 'month') {
        key = `${createTime.getFullYear()}-${String(createTime.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'week') {
        const weekStart = new Date(createTime);
        weekStart.setDate(createTime.getDate() - createTime.getDay());
        key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      } else {
        key = `${createTime.getFullYear()}-${String(createTime.getMonth() + 1).padStart(2, '0')}-${String(createTime.getDate()).padStart(2, '0')}`;
      }
      
      groupedData[key] = (groupedData[key] || 0) + 1;
    });

    // 生成时间序列
    const labels = [];
    const data = [];
    let cumulativeCount = 0;

    // 获取最早的客户创建时间
    const firstCustomerTime = new Date(customers.data[0].createTime);
    
    if (period === 'month') {
      for (let i = limit - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        labels.push(`${date.getFullYear()}年${date.getMonth() + 1}月`);
        
        cumulativeCount += (groupedData[key] || 0);
        data.push(cumulativeCount);
      }
    }

    return {
      success: true,
      data: {
        labels,
        datasets: [{
          label: '累计客户数量',
          data,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }
    };
  } catch (error) {
    console.error('获取客户增长趋势失败:', error);
    throw error;
  }
}

/**
 * 获取行业分布
 */
async function getIndustryDistribution(data) {
  try {
    const customers = await customerCollection.get();
    
    if (customers.data.length === 0) {
      return {
        success: true,
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1
          }]
        }
      };
    }

    // 统计行业分布
    const industryCount = {};
    
    customers.data.forEach(customer => {
      let industry = customer.company || '未知行业';
      
      // 简单的行业分类逻辑
      if (industry.includes('科技') || industry.includes('技术') || industry.includes('软件')) {
        industry = '科技行业';
      } else if (industry.includes('金融') || industry.includes('银行') || industry.includes('投资')) {
        industry = '金融行业';
      } else if (industry.includes('教育') || industry.includes('培训') || industry.includes('学校')) {
        industry = '教育行业';
      } else if (industry.includes('医疗') || industry.includes('医院') || industry.includes('健康')) {
        industry = '医疗行业';
      } else if (industry.includes('制造') || industry.includes('工厂') || industry.includes('生产')) {
        industry = '制造业';
      } else if (industry === '' || industry === '未知行业') {
        industry = '其他';
      } else {
        industry = '其他';
      }
      
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });

    const labels = Object.keys(industryCount);
    const dataValues = Object.values(industryCount);
    
    // 生成颜色
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // 蓝色
      'rgba(16, 185, 129, 0.8)',   // 绿色
      'rgba(245, 158, 11, 0.8)',   // 黄色
      'rgba(239, 68, 68, 0.8)',    // 红色
      'rgba(139, 92, 246, 0.8)',   // 紫色
      'rgba(236, 72, 153, 0.8)',   // 粉色
      'rgba(6, 182, 212, 0.8)',    // 青色
      'rgba(34, 197, 94, 0.8)'     // 浅绿色
    ];

    return {
      success: true,
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }]
      }
    };
  } catch (error) {
    console.error('获取行业分布失败:', error);
    throw error;
  }
}

/**
 * 获取互动统计
 */
async function getInteractionStats(data) {
  try {
    const interactions = await interactionCollection.get();
    
    if (interactions.data.length === 0) {
      return {
        success: true,
        data: {
          labels: [],
          datasets: [{
            label: '互动次数',
            data: [],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }]
        }
      };
    }

    // 统计互动类型分布
    const typeCount = {};
    
    interactions.data.forEach(interaction => {
      const type = interaction.type || '其他';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const labels = Object.keys(typeCount);
    const dataValues = Object.values(typeCount);

    return {
      success: true,
      data: {
        labels,
        datasets: [{
          label: '互动次数',
          data: dataValues,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1
        }]
      }
    };
  } catch (error) {
    console.error('获取互动统计失败:', error);
    throw error;
  }
}

/**
 * 获取跟进状态分布
 */
async function getFollowUpStatusDistribution(data) {
  try {
    const customers = await customerCollection.get();
    
    if (customers.data.length === 0) {
      return {
        success: true,
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: [],
            borderColor: [],
            borderWidth: 1
          }]
        }
      };
    }

    // 统计跟进状态分布
    const statusCount = {};
    
    customers.data.forEach(customer => {
      const status = customer.lastFollowUpStatus || '未跟进';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const labels = Object.keys(statusCount);
    const dataValues = Object.values(statusCount);
    
    // 状态对应的颜色
    const statusColors = {
      '初步接触': 'rgba(59, 130, 246, 0.8)',
      '需求确认': 'rgba(245, 158, 11, 0.8)',
      '方案制定': 'rgba(139, 92, 246, 0.8)',
      '合同谈判': 'rgba(236, 72, 153, 0.8)',
      '成交': 'rgba(16, 185, 129, 0.8)',
      '暂停跟进': 'rgba(107, 114, 128, 0.8)',
      '未跟进': 'rgba(239, 68, 68, 0.8)'
    };

    const colors = labels.map(label => statusColors[label] || 'rgba(156, 163, 175, 0.8)');

    return {
      success: true,
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          borderColor: colors.map(color => color.replace('0.8', '1')),
          borderWidth: 1
        }]
      }
    };
  } catch (error) {
    console.error('获取跟进状态分布失败:', error);
    throw error;
  }
}

/**
 * 获取仪表板概览数据
 */
async function getDashboardOverview(data) {
  try {
    // 并行获取各种统计数据
    const [customersResult, interactionsResult] = await Promise.all([
      customerCollection.get(),
      interactionCollection.get()
    ]);

    const customers = customersResult.data;
    const interactions = interactionsResult.data;

    // 计算基础统计
    const totalCustomers = customers.length;
    const totalInteractions = interactions.length;
    
    // 计算本月新增客户
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = customers.filter(customer => 
      new Date(customer.createTime) >= thisMonthStart
    ).length;

    // 计算成交客户数
    const dealClosedCustomers = customers.filter(customer => 
      customer.lastFollowUpStatus === '成交'
    ).length;

    return {
      success: true,
      data: {
        totalCustomers,
        totalInteractions,
        newCustomersThisMonth,
        dealClosedCustomers,
        conversionRate: totalCustomers > 0 ? ((dealClosedCustomers / totalCustomers) * 100).toFixed(1) : '0.0'
      }
    };
  } catch (error) {
    console.error('获取仪表板概览失败:', error);
    throw error;
  }
}

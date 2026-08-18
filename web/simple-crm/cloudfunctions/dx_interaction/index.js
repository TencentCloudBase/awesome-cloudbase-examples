const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const interactionCollection = db.collection('dx_interactions');
const customerCollection = db.collection('dx_customers');

// 跟进状态枚举
const FOLLOW_UP_STATUS = {
  INITIAL_CONTACT: '初步接触',
  REQUIREMENT_CONFIRMATION: '需求确认', 
  SOLUTION_DESIGN: '方案制定',
  CONTRACT_NEGOTIATION: '合同谈判',
  DEAL_CLOSED: '成交',
  FOLLOW_UP_PAUSED: '暂停跟进'
};

// 互动类型枚举
const INTERACTION_TYPES = {
  PHONE: '电话',
  EMAIL: '邮件', 
  MEETING: '会议',
  OTHER: '其他'
};

/**
 * 互动记录管理云函数
 * 支持增删改查操作和客户状态管理
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'create':
        return await createInteraction(data);
      case 'list':
        return await listInteractions(data);
      case 'get':
        return await getInteraction(data);
      case 'update':
        return await updateInteraction(data);
      case 'delete':
        return await deleteInteraction(data);
      case 'updateCustomerStatus':
        return await updateCustomerStatus(data);
      case 'getCustomerInteractions':
        return await getCustomerInteractions(data);
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message || '服务器内部错误'
    };
  }
};

/**
 * 创建互动记录
 */
async function createInteraction(data) {
  const { customerId, type, content, followUpStatus, nextFollowUp } = data;

  // 数据验证
  if (!customerId || !type || !content) {
    return {
      success: false,
      error: '客户ID、互动类型和内容为必填项'
    };
  }

  // 验证互动类型
  if (!Object.values(INTERACTION_TYPES).includes(type)) {
    return {
      success: false,
      error: '无效的互动类型'
    };
  }

  // 验证跟进状态
  if (followUpStatus && !Object.values(FOLLOW_UP_STATUS).includes(followUpStatus)) {
    return {
      success: false,
      error: '无效的跟进状态'
    };
  }

  // 获取客户信息
  const customerResult = await customerCollection.doc(customerId).get();
  if (customerResult.data.length === 0) {
    return {
      success: false,
      error: '客户不存在'
    };
  }

  const customer = customerResult.data[0];

  const interactionData = {
    customerId,
    customerName: customer.name,
    type,
    content,
    followUpStatus: followUpStatus || FOLLOW_UP_STATUS.INITIAL_CONTACT,
    nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
    createTime: new Date(),
    updateTime: new Date()
  };

  const result = await interactionCollection.add(interactionData);

  // 如果有跟进状态，同时更新客户的最新状态
  if (followUpStatus) {
    await customerCollection.doc(customerId).update({
      lastFollowUpStatus: followUpStatus,
      lastInteractionTime: new Date(),
      updateTime: new Date()
    });
  }

  return {
    success: true,
    data: {
      _id: result.id,
      ...interactionData
    }
  };
}

/**
 * 获取互动记录列表
 */
async function listInteractions(data = {}) {
  const { page = 1, limit = 10, customerId, type, followUpStatus } = data;
  const skip = (page - 1) * limit;

  let query = interactionCollection;

  // 按客户筛选
  if (customerId) {
    query = query.where({ customerId });
  }

  // 按类型筛选
  if (type) {
    query = query.where({ type });
  }

  // 按跟进状态筛选
  if (followUpStatus) {
    query = query.where({ followUpStatus });
  }

  // 获取总数
  const countResult = await query.count();
  const total = countResult.total;

  // 获取分页数据
  const result = await query
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  return {
    success: true,
    data: {
      list: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * 获取单个互动记录
 */
async function getInteraction(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      error: '互动记录ID不能为空'
    };
  }

  const result = await interactionCollection.doc(id).get();

  if (result.data.length === 0) {
    return {
      success: false,
      error: '互动记录不存在'
    };
  }

  return {
    success: true,
    data: result.data[0]
  };
}

/**
 * 更新互动记录
 */
async function updateInteraction(data) {
  const { id, type, content, followUpStatus, nextFollowUp } = data;

  if (!id) {
    return {
      success: false,
      error: '互动记录ID不能为空'
    };
  }

  if (!type || !content) {
    return {
      success: false,
      error: '互动类型和内容为必填项'
    };
  }

  // 验证互动类型
  if (!Object.values(INTERACTION_TYPES).includes(type)) {
    return {
      success: false,
      error: '无效的互动类型'
    };
  }

  // 验证跟进状态
  if (followUpStatus && !Object.values(FOLLOW_UP_STATUS).includes(followUpStatus)) {
    return {
      success: false,
      error: '无效的跟进状态'
    };
  }

  // 检查记录是否存在
  const existingResult = await interactionCollection.doc(id).get();
  if (existingResult.data.length === 0) {
    return {
      success: false,
      error: '互动记录不存在'
    };
  }

  const updateData = {
    type,
    content,
    followUpStatus: followUpStatus || existingResult.data[0].followUpStatus,
    nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
    updateTime: new Date()
  };

  await interactionCollection.doc(id).update(updateData);

  // 如果更新了跟进状态，同时更新客户的最新状态
  if (followUpStatus) {
    const interaction = existingResult.data[0];
    await customerCollection.doc(interaction.customerId).update({
      lastFollowUpStatus: followUpStatus,
      lastInteractionTime: new Date(),
      updateTime: new Date()
    });
  }

  return {
    success: true,
    data: {
      _id: id,
      ...updateData
    }
  };
}

/**
 * 删除互动记录
 */
async function deleteInteraction(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      error: '互动记录ID不能为空'
    };
  }

  // 检查记录是否存在
  const existingResult = await interactionCollection.doc(id).get();
  if (existingResult.data.length === 0) {
    return {
      success: false,
      error: '互动记录不存在'
    };
  }

  await interactionCollection.doc(id).remove();

  return {
    success: true,
    message: '互动记录删除成功'
  };
}

/**
 * 更新客户跟进状态
 */
async function updateCustomerStatus(data) {
  const { customerId, followUpStatus } = data;

  if (!customerId || !followUpStatus) {
    return {
      success: false,
      error: '客户ID和跟进状态为必填项'
    };
  }

  // 验证跟进状态
  if (!Object.values(FOLLOW_UP_STATUS).includes(followUpStatus)) {
    return {
      success: false,
      error: '无效的跟进状态'
    };
  }

  // 检查客户是否存在
  const customerResult = await customerCollection.doc(customerId).get();
  if (customerResult.data.length === 0) {
    return {
      success: false,
      error: '客户不存在'
    };
  }

  await customerCollection.doc(customerId).update({
    lastFollowUpStatus: followUpStatus,
    updateTime: new Date()
  });

  return {
    success: true,
    message: '客户状态更新成功'
  };
}

/**
 * 获取指定客户的互动记录
 */
async function getCustomerInteractions(data) {
  const { customerId, page = 1, limit = 20 } = data;

  if (!customerId) {
    return {
      success: false,
      error: '客户ID不能为空'
    };
  }

  const skip = (page - 1) * limit;

  // 获取总数
  const countResult = await interactionCollection.where({ customerId }).count();
  const total = countResult.total;

  // 获取分页数据
  const result = await interactionCollection
    .where({ customerId })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get();

  return {
    success: true,
    data: {
      list: result.data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

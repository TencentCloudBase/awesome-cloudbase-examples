const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});

const db = app.database();
const collection = db.collection('dx_customers');

/**
 * 客户管理云函数
 * 支持增删改查操作
 */
exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'create':
        return await createCustomer(data);
      case 'list':
        return await listCustomers(data);
      case 'get':
        return await getCustomer(data);
      case 'update':
        return await updateCustomer(data);
      case 'delete':
        return await deleteCustomer(data);
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
 * 创建客户
 */
async function createCustomer(data) {
  const { name, phone, email, company, position, address, notes } = data;

  // 数据验证
  if (!name || !phone) {
    return {
      success: false,
      error: '客户姓名和联系电话为必填项'
    };
  }

  // 检查手机号是否已存在
  const existingCustomer = await collection.where({
    phone: phone
  }).get();

  if (existingCustomer.data.length > 0) {
    return {
      success: false,
      error: '该手机号已存在'
    };
  }

  const customerData = {
    name,
    phone,
    email: email || '',
    company: company || '',
    position: position || '',
    address: address || '',
    notes: notes || '',
    createTime: new Date(),
    updateTime: new Date()
  };

  const result = await collection.add(customerData);

  return {
    success: true,
    data: {
      _id: result.id,
      ...customerData
    }
  };
}

/**
 * 获取客户列表
 */
async function listCustomers(data = {}) {
  const { page = 1, limit = 10, keyword = '' } = data;
  const skip = (page - 1) * limit;

  let query = collection;

  // 关键词搜索
  if (keyword) {
    query = query.where({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { company: { $regex: keyword, $options: 'i' } }
      ]
    });
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
 * 获取单个客户信息
 */
async function getCustomer(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      error: '客户ID不能为空'
    };
  }

  const result = await collection.doc(id).get();

  if (result.data.length === 0) {
    return {
      success: false,
      error: '客户不存在'
    };
  }

  return {
    success: true,
    data: result.data[0]
  };
}

/**
 * 更新客户信息
 */
async function updateCustomer(data) {
  const { id, name, phone, email, company, position, address, notes } = data;

  if (!id) {
    return {
      success: false,
      error: '客户ID不能为空'
    };
  }

  if (!name || !phone) {
    return {
      success: false,
      error: '客户姓名和联系电话为必填项'
    };
  }

  // 检查客户是否存在
  const existingResult = await collection.doc(id).get();
  if (existingResult.data.length === 0) {
    return {
      success: false,
      error: '客户不存在'
    };
  }

  // 检查手机号是否被其他客户使用
  const phoneCheckResult = await collection.where({
    phone: phone,
    _id: { $ne: id }
  }).get();

  if (phoneCheckResult.data.length > 0) {
    return {
      success: false,
      error: '该手机号已被其他客户使用'
    };
  }

  const updateData = {
    name,
    phone,
    email: email || '',
    company: company || '',
    position: position || '',
    address: address || '',
    notes: notes || '',
    updateTime: new Date()
  };

  await collection.doc(id).update(updateData);

  return {
    success: true,
    data: {
      _id: id,
      ...updateData
    }
  };
}

/**
 * 删除客户
 */
async function deleteCustomer(data) {
  const { id } = data;

  if (!id) {
    return {
      success: false,
      error: '客户ID不能为空'
    };
  }

  // 检查客户是否存在
  const existingResult = await collection.doc(id).get();
  if (existingResult.data.length === 0) {
    return {
      success: false,
      error: '客户不存在'
    };
  }

  await collection.doc(id).remove();

  return {
    success: true,
    message: '客户删除成功'
  };
}

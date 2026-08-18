const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { nickName, avatarUrl } = event;
  
  if (!OPENID) {
    return {
      success: false,
      error: '获取用户身份失败'
    };
  }

  try {
    // 构建更新数据
    const updateData = {
      updateTime: new Date()
    };
    
    if (nickName !== undefined) {
      updateData.nickName = nickName;
    }
    
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    // 更新用户信息
    const updateResult = await db.collection('dating_users').where({
      openid: OPENID
    }).update({
      data: updateData
    });

    if (updateResult.stats.updated === 0) {
      return {
        success: false,
        error: '用户不存在'
      };
    }

    return {
      success: true,
      message: '用户信息更新成功'
    };
    
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return {
      success: false,
      error: error.message || '更新用户信息失败'
    };
  }
}; 
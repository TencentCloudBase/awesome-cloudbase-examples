const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    console.log('更新用户资料，openid:', openid);
    console.log('更新数据:', event);
    
    if (!openid) {
      return {
        success: false,
        error: '无法获取用户身份，请在小程序中使用',
        errorCode: 'NO_OPENID'
      };
    }
    
    const { nickname, signature, avatar } = event;
    
    // 验证输入数据
    if (!nickname && !signature && !avatar) {
      return {
        success: false,
        error: '至少需要提供一个要更新的字段'
      };
    }
    
    // 构建更新数据
    const updateData = {
      updateTime: new Date()
    };
    
    if (nickname) {
      // 验证昵称长度
      if (nickname.length > 20) {
        return {
          success: false,
          error: '昵称长度不能超过20个字符'
        };
      }
      updateData.nickname = nickname;
    }
    
    if (signature) {
      // 验证签名长度
      if (signature.length > 50) {
        return {
          success: false,
          error: '个性签名长度不能超过50个字符'
        };
      }
      updateData.signature = signature;
    }
    
    if (avatar) {
      updateData.avatar = avatar;
    }
    
    // 查找用户记录
    const userResult = await db.collection('cursor_users').where({
      openid: openid
    }).get();
    
    if (!userResult.data || userResult.data.length === 0) {
      return {
        success: false,
        error: '用户不存在，请先登录'
      };
    }
    
    const userId = userResult.data[0]._id;
    
    // 更新用户信息
    const updateResult = await db.collection('cursor_users').doc(userId).update({
      data: updateData
    });
    
    console.log('用户资料更新成功:', updateResult);
    
    // 返回更新后的用户信息
    const updatedUserResult = await db.collection('cursor_users').doc(userId).get();
    
    return {
      success: true,
      data: {
        userInfo: updatedUserResult.data,
        updated: updateData
      },
      message: '资料更新成功'
    };
    
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return {
      success: false,
      error: error.message || '更新用户资料失败',
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}; 
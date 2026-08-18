const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  
  if (!OPENID) {
    return {
      success: false,
      error: '获取用户身份失败'
    };
  }

  try {
    // 从event中获取用户信息
    const userInfo = event.userInfo || {};
    
    // 查询用户是否已存在
    const userQuery = await db.collection('dating_users').where({
      openid: OPENID
    }).get();

    let userData;
    
    if (userQuery.data.length === 0) {
      // 用户不存在，创建新用户
      const now = new Date();
      const newUser = {
        openid: OPENID,
        nickName: userInfo.nickName || '新用户',
        avatarUrl: userInfo.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
        joinDate: now,
        totalBookings: 0,
        completedBookings: 0,
        learningHours: 0,
        createTime: now,
        updateTime: now
      };
      
      const addResult = await db.collection('dating_users').add({
        data: newUser
      });
      
      userData = {
        ...newUser,
        _id: addResult._id
      };
      
      console.log('新用户注册成功:', OPENID);
    } else {
      // 用户已存在，更新最后登录时间和用户信息
      userData = userQuery.data[0];
      
      const updateData = {
        lastLoginTime: new Date(),
        updateTime: new Date()
      };
      
      // 如果传入了新的用户信息，则更新
      if (userInfo.nickName) {
        updateData.nickName = userInfo.nickName;
      }
      if (userInfo.avatarUrl) {
        updateData.avatarUrl = userInfo.avatarUrl;
      }
      
      await db.collection('dating_users').doc(userData._id).update({
        data: updateData
      });
      
      // 更新本地数据
      Object.assign(userData, updateData);
      
      console.log('用户登录成功:', OPENID);
    }

    // 返回用户信息（不包含敏感信息）
    return {
      success: true,
      data: {
        _id: userData._id,
        openid: userData.openid,
        nickName: userData.nickName,
        avatarUrl: userData.avatarUrl,
        joinDate: userData.joinDate,
        totalBookings: userData.totalBookings,
        completedBookings: userData.completedBookings,
        learningHours: userData.learningHours,
        createTime: userData.createTime
      }
    };
    
  } catch (error) {
    console.error('用户登录失败:', error);
    return {
      success: false,
      error: error.message || '登录失败，请重试'
    };
  }
}; 
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
    // 获取用户基本信息
    const userQuery = await db.collection('dating_users').where({
      openid: OPENID
    }).get();

    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在，请先登录'
      };
    }

    const userInfo = userQuery.data[0];

    // 获取用户预约统计
    const bookingsQuery = await db.collection('dating_bookings').where({
      userId: OPENID
    }).get();

    const bookings = bookingsQuery.data;
    const now = new Date();
    
    // 计算统计数据
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(booking => {
      const courseTime = new Date(booking.courseTime);
      return courseTime < now && booking.status !== 'cancelled';
    }).length;
    
    const upcomingBookings = bookings.filter(booking => {
      const courseTime = new Date(booking.courseTime);
      return courseTime >= now && booking.status !== 'cancelled';
    }).length;

    // 计算学习时长（假设每门完成的课程2小时）
    const learningHours = completedBookings * 2;

    // 更新用户统计数据
    await db.collection('dating_users').doc(userInfo._id).update({
      data: {
        totalBookings: totalBookings,
        completedBookings: completedBookings,
        learningHours: learningHours,
        updateTime: new Date()
      }
    });

    return {
      success: true,
      data: {
        nickName: userInfo.nickName || '用户',
        avatarUrl: userInfo.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
        createTime: userInfo.createTime,
        totalBookings: totalBookings,
        completedBookings: completedBookings,
        learningHours: learningHours,
        upcomingBookings: upcomingBookings
      }
    };
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      error: error.message || '获取用户信息失败'
    };
  }
}; 
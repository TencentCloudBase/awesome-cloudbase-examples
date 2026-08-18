const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取用户预约记录
 * @param {string} status - 预约状态过滤（可选）
 * @param {number} limit - 返回数量限制（默认20）
 * @param {number} offset - 偏移量（默认0）
 */
exports.main = async (event, context) => {
  try {
    // 从微信上下文获取用户openId
    const wxContext = cloud.getWXContext();
    const { OPENID } = wxContext;
    
    if (!OPENID) {
      return {
        success: false,
        error: '获取用户身份失败'
      };
    }
    
    const { status, limit = 20, offset = 0 } = event;
    
    // 构建查询条件
    let query = { userId: OPENID }; // 注意：数据库中存储的字段是userId
    
    // 状态筛选
    if (status) {
      query.status = status;
    }
    
    // 查询用户预约记录
    const bookingsResult = await db.collection('dating_bookings')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip(offset)
      .limit(limit)
      .get();
    
    // 获取课程详细信息
    const bookings = [];
    for (const booking of bookingsResult.data) {
      // 获取课程详情
      const courseResult = await db.collection('dating_courses')
        .doc(booking.courseId)
        .get();
      
      if (courseResult.data) {
        const course = courseResult.data;
        bookings.push({
          _id: booking._id,
          courseId: booking.courseId,
          courseTitle: course.title,
          courseSubtitle: course.subtitle,
          courseImage: course.image,
          instructorName: course.instructor.name,
          courseTime: booking.courseTime,
          courseLocation: course.location,
          courseDuration: course.duration,
          status: booking.status,
          createTime: booking.createTime
        });
      }
    }
    
    // 计算统计数据
    const allBookingsResult = await db.collection('dating_bookings')
      .where({ userId: OPENID })
      .get();
    
    const stats = calculateUserStats(allBookingsResult.data);
    
    return {
      success: true,
      data: {
        bookings,
        stats,
        total: allBookingsResult.data.length
      }
    };
    
  } catch (error) {
    console.error('获取用户预约记录失败:', error);
    return {
      success: false,
      error: error.message || '获取预约记录失败'
    };
  }
};

/**
 * 计算用户统计数据
 */
function calculateUserStats(bookings) {
  const totalBookings = bookings.filter(b => b.status !== 'cancelled').length;
  const completedBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const courseDate = new Date(b.courseTime);
    return courseDate <= new Date();
  }).length;
  
  // 计算总学习时长（假设每个课程平均2小时）
  const totalHours = completedBookings * 2;
  
  return {
    totalBookings,
    completedBookings,
    totalHours,
    experienceLevel: getExperienceLevel(completedBookings)
  };
}

/**
 * 根据完成课程数量计算经验等级
 */
function getExperienceLevel(completedCount) {
  if (completedCount === 0) return '新手';
  if (completedCount <= 2) return '入门';
  if (completedCount <= 5) return '进阶';
  if (completedCount <= 10) return '熟练';
  return '专家';
} 
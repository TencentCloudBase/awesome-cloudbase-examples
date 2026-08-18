const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 预约课程
 * @param {string} courseId - 课程ID
 * @param {object} userInfo - 用户信息（可选）
 * 
 * 并发安全设计：
 * 1. 事务外进行基础校验（减少事务持有时间）
 * 2. 事务内再次读取最新数据并校验
 * 3. 先更新课程人数，再创建预约记录
 * 4. 利用事务的隔离性防止竞态条件
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
    
    const { courseId, userInfo } = event;
    
    // 参数验证
    if (!courseId) {
      return {
        success: false,
        error: '课程ID不能为空'
      };
    }
    
    // 获取课程信息
    const courseResult = await db.collection('dating_courses')
      .doc(courseId)
      .get();
    
    if (!courseResult.data) {
      return {
        success: false,
        error: '课程不存在'
      };
    }
    
    const course = courseResult.data;
    
    // 检查课程是否还有余位
    if (course.currentParticipants >= course.maxParticipants) {
      return {
        success: false,
        error: '课程已满，无法预约'
      };
    }
    
    // 检查课程时间是否已过（使用北京时间比较）
    const beijingTime = getBeijingTime();
    const courseDateTime = new Date(`${course.date} ${course.time.split('-')[0]}`);
    
    if (courseDateTime <= beijingTime) {
      return {
        success: false,
        error: '课程时间已过，无法预约'
      };
    }
    
    // 检查用户是否已经预约过这个课程
    const existingBooking = await db.collection('dating_bookings')
      .where({
        courseId: courseId,
        userId: OPENID, // 注意：数据库中存储的字段是userId
        status: _.in(['pending', 'confirmed'])
      })
      .get();
    
    if (existingBooking.data.length > 0) {
      return {
        success: false,
        error: '您已预约过此课程'
      };
    }
    
    // 开始事务处理
    const transaction = await db.startTransaction();
    
    try {
      // 1. 在事务内再次获取最新的课程信息（防止并发问题）
      const latestCourseResult = await transaction.collection('dating_courses')
        .doc(courseId)
        .get();
      
      if (!latestCourseResult.data) {
        await transaction.rollback();
        return {
          success: false,
          error: '课程不存在'
        };
      }
      
      const latestCourse = latestCourseResult.data;
      
      // 再次检查课程是否还有余位（基于事务内的最新数据）
      if (latestCourse.currentParticipants >= latestCourse.maxParticipants) {
        await transaction.rollback();
        return {
          success: false,
          error: '课程已满，预约失败'
        };
      }
      
      // 2. 更新课程人数
      await transaction.collection('dating_courses')
        .doc(courseId)
        .update({
          data: {
            currentParticipants: latestCourse.currentParticipants + 1
          }
        });
       
       // 3. 创建预约记录
      const bookingData = {
        courseId: courseId,
        userId: OPENID, // 使用userId字段
        courseTitle: course.title,
        courseTime: `${course.date} ${course.time.split('-')[0]}`,
        courseTimeDisplay: formatDateDisplay(course.date, course.time),
        courseLocation: course.address,
        courseLocationShort: course.location,
        status: 'confirmed', // pending: 待确认, confirmed: 已确认, cancelled: 已取消
        createTime: new Date(),
        userInfo: userInfo || {}
      };
      
      await transaction.collection('dating_bookings').add({
        data: bookingData
      });
      
      // 4. 提交事务
      await transaction.commit();
      
      return {
        success: true,
        message: '预约成功',
        data: {
          courseTitle: course.title,
          courseTime: formatDateDisplay(course.date, course.time),
          location: course.location
        }
      };
      
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback();
      throw transactionError;
    }
    
  } catch (error) {
    console.error('预约课程失败:', error);
    return {
      success: false,
      error: error.message || '预约失败，请稍后重试'
    };
  }
};

/**
 * 获取北京时间（云函数默认UTC时间 + 8小时）
 * @returns {Date} 北京时间
 */
function getBeijingTime() {
  const now = new Date();
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * 格式化日期显示
 */
function formatDateDisplay(date, time) {
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const startTime = time.split('-')[0];
  
  return `${month}月${day}日 ${startTime}`;
} 
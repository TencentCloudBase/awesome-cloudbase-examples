const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 取消预约
 * @param {string} courseId - 课程ID
 * @param {string} bookingId - 预约记录ID（可选）
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
    
    const { courseId, bookingId } = event;
    
    // 参数验证
    if (!courseId) {
      return {
        success: false,
        error: '课程ID不能为空'
      };
    }
    
    // 查找预约记录
    let bookingQuery = {
      courseId: courseId,
      userId: OPENID, // 注意：数据库中存储的字段是userId
      status: _.in(['pending', 'confirmed'])
    };
    
    // 如果提供了bookingId，则用bookingId查找
    if (bookingId) {
      bookingQuery = { _id: bookingId, userId: OPENID };
    }
    
    const bookingResult = await db.collection('dating_bookings')
      .where(bookingQuery)
      .get();
    
    if (bookingResult.data.length === 0) {
      return {
        success: false,
        error: '预约记录不存在或已取消'
      };
    }
    
    const booking = bookingResult.data[0];
    
    // 检查课程时间是否允许取消（比如开课前2小时不能取消）
    // 使用北京时间进行比较
    const beijingTime = getBeijingTime();
    const courseDateTime = new Date(booking.courseTime);
    const timeDiff = (courseDateTime - beijingTime) / (1000 * 60 * 60); // 小时差
    
    if (timeDiff < 2) {
      return {
        success: false,
        error: '开课前2小时内不能取消预约'
      };
    }
    
    // 开始事务处理
    const transaction = await db.startTransaction();
    
    try {
      // 1. 更新预约状态为已取消
      await transaction.collection('dating_bookings')
        .doc(booking._id)
        .update({
          data: {
            status: 'cancelled',
            cancelTime: new Date()
          }
        });
      
      // 2. 减少课程参与人数
      await transaction.collection('dating_courses')
        .doc(booking.courseId)
        .update({
          data: {
            currentParticipants: _.inc(-1)
          }
        });
      
      // 3. 提交事务
      await transaction.commit();
      
      return {
        success: true,
        message: '预约已取消'
      };
      
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback();
      throw transactionError;
    }
    
  } catch (error) {
    console.error('取消预约失败:', error);
    return {
      success: false,
      error: error.message || '取消预约失败，请稍后重试'
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
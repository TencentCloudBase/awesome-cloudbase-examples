const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取课程列表
 * @param {string} category - 课程分类（可选）
 * @param {number} limit - 返回数量限制（默认20）
 * @param {number} offset - 偏移量（默认0）
 */
exports.main = async (event, context) => {
  try {
    const { category, limit = 20, offset = 0 } = event;
    
    // 构建查询条件
    let query = {};
    
    // 分类筛选
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // 查询课程数据
    const coursesQuery = db.collection('dating_courses')
      .where(query)
      .skip(offset)
      .limit(limit);
    
    const coursesResult = await coursesQuery.get();
    
    // 获取当前北京时间（UTC+8）
    const beijingTime = getBeijingTime();
    console.log('当前北京时间:', beijingTime.toISOString(), '本地时间:', beijingTime.toString());
    
    // 过滤出有余位且未过期的课程
    const filteredCourses = coursesResult.data.filter(course => {
      // 检查是否有余位
      const hasSpace = course.currentParticipants < course.maxParticipants;
      
      // 检查课程时间是否已过（基于北京时间比较）
      const courseDateTime = new Date(`${course.date} ${course.time.split('-')[0]}`);
      const isNotExpired = courseDateTime > beijingTime;
      
      console.log(`课程: ${course.title}, 时间: ${course.date} ${course.time}, 解析后: ${courseDateTime.toISOString()}, 北京时间: ${beijingTime.toISOString()}, 未过期: ${isNotExpired}, 有余位: ${hasSpace}`);
      
      return hasSpace && isNotExpired;
    });
    
    // 转换数据格式以匹配前端期望的结构
    const courses = filteredCourses.map(course => ({
      id: course._id,
      title: course.title,
      subtitle: course.description,
      image: course.image,
      instructor: {
        name: course.instructor,
        avatar: course.instructorAvatar
      },
      students: course.currentParticipants * 50 + Math.floor(Math.random() * 1000), // 模拟总学习人数
      rating: course.rating,
      price: course.price,
      category: course.category,
      courseTime: `${course.date} ${course.time.split('-')[0]}`,
      courseTimeDisplay: formatDateDisplay(course.date, course.time),
      location: course.address,
      locationShort: course.location,
      maxStudents: course.maxParticipants,
      currentStudents: course.currentParticipants,
      duration: course.duration,
      isOffline: true
    }));
    
    // 获取总数用于分页
    const totalResult = await db.collection('dating_courses')
      .where(query)
      .count();
    
    return {
      success: true,
      data: {
        courses,
        total: totalResult.total,
        hasMore: (offset + limit) < totalResult.total
      }
    };
    
  } catch (error) {
    console.error('获取课程列表失败:', error);
    return {
      success: false,
      error: error.message || '获取课程列表失败'
    };
  }
};

/**
 * 获取北京时间（UTC+8）
 * @returns {Date} 北京时间
 */
function getBeijingTime() {
  const now = new Date();
  // 云函数运行在UTC时区，直接加8小时得到北京时间
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * 格式化日期显示
 * @param {string} date - YYYY-MM-DD 格式日期
 * @param {string} time - HH:MM-HH:MM 格式时间
 */
function formatDateDisplay(date, time) {
  const dateObj = new Date(date);
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const startTime = time.split('-')[0];
  
  return `${month}月${day}日 ${startTime}`;
} 
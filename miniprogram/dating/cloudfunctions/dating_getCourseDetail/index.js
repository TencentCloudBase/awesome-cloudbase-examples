const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 获取课程详情
 * @param {string} courseId - 课程ID
 */
exports.main = async (event, context) => {
  try {
    // 从微信上下文获取用户openId（用于检查是否已预约）
    const wxContext = cloud.getWXContext();
    const { OPENID } = wxContext;
    
    const { courseId } = event;
    
    if (!courseId) {
      return {
        success: false,
        error: '课程ID不能为空'
      };
    }
    
    // 获取课程详情
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
    
    // 检查用户是否已预约（如果用户已登录）
    let isBooked = false;
    if (OPENID) {
      const bookingResult = await db.collection('dating_bookings')
        .where({
          courseId: courseId,
          userId: OPENID, // 注意：数据库中存储的字段是userId
          status: db.RegExp({
            regexp: '^(pending|confirmed)$',
            options: 'i'
          })
        })
        .get();
      
      isBooked = bookingResult.data.length > 0;
    }
    
    // 转换数据格式以匹配前端期望的结构
    const courseDetail = {
      id: course._id,
      title: course.title,
      subtitle: course.description,
      image: course.image,
      instructor: {
        name: course.instructor,
        avatar: course.instructorAvatar,
        title: course.instructorBio.split('，')[0] || '资深导师',
        experience: extractExperience(course.instructorBio),
        successRate: extractSuccessRate(course.instructorBio)
      },
      courseTime: `${course.date} ${course.time.split('-')[0]}`,
      courseTimeDisplay: formatDateDisplay(course.date, course.time),
      location: course.address,
      locationShort: course.location,
      maxStudents: course.maxParticipants,
      currentStudents: course.currentParticipants,
      duration: course.duration,
      price: course.price,
      rating: course.rating,
      reviewCount: course.reviewCount,
      category: course.category,
      tags: course.tags,
      description: course.description,
      outline: course.outline.map((item, index) => ({
        title: `第${index + 1}部分：${item}`,
        content: getOutlineContent(item),
        duration: getDurationByIndex(index, course.duration)
      })),
      benefits: course.benefits,
      audience: course.targetAudience,
      notices: course.notices,
      isBooked: isBooked
    };
    
    return {
      success: true,
      data: courseDetail
    };
    
  } catch (error) {
    console.error('获取课程详情失败:', error);
    return {
      success: false,
      error: error.message || '获取课程详情失败'
    };
  }
};

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

/**
 * 从讲师介绍中提取经验年限
 */
function extractExperience(bio) {
  const match = bio.match(/(\d+)年/);
  return match ? `${match[1]}年教学经验` : '丰富教学经验';
}

/**
 * 从讲师介绍中提取成功率
 */  
function extractSuccessRate(bio) {
  const match = bio.match(/(\d+)%/);
  return match ? `${match[1]}%` : '90%+';
}

/**
 * 根据大纲标题生成内容描述
 */
function getOutlineContent(title) {
  const contentMap = {
    '咖啡基础知识介绍': '了解不同咖啡豆的特点，学习基础冲泡技巧',
    '约会前的准备工作': '形象准备、心理准备、话题准备等全方位指导',
    '聊天技巧实战演练': '掌握开场白技巧，学会延续话题的方法',
    '身体语言与眼神交流': '解读肢体语言信号，提升非语言沟通能力',
    '如何处理尴尬时刻': '应对冷场、化解尴尬的实用方法',
    '约会后的跟进技巧': '后续联系的时机把握和方式选择'
  };
  
  return contentMap[title] || '详细讲解相关技巧和实用方法';
}

/**
 * 根据索引分配时长
 */
function getDurationByIndex(index, totalDuration) {
  const durations = ['30分钟', '45分钟', '60分钟', '45分钟', '30分钟', '30分钟'];
  return durations[index] || '30分钟';
} 
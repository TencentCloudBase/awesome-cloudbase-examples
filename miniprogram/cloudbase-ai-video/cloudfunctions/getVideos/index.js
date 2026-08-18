const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取视频列表
exports.main = async (event, context) => {
  try {
    const { page = 1, limit = 10, type = 'all' } = event
    const skip = (page - 1) * limit
    
    let query = db.collection('cursor_videos').where({
      status: 'published'
    })
    
    // 根据类型筛选
    if (type === 'user') {
      const wxContext = cloud.getWXContext()
      query = query.where({
        openid: wxContext.OPENID
      })
    }
    
    const result = await query
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    // 获取所有视频的 openid 列表
    const openids = [...new Set(result.data.map(video => video.openid).filter(id => id))]
    
    // 批量查询用户信息
    let usersMap = {}
    if (openids.length > 0) {
      const usersResult = await db.collection('cursor_users')
        .where({
          openid: db.command.in(openids)
        })
        .get()
      
      // 构建 openid -> 用户信息 的映射
      usersMap = usersResult.data.reduce((map, user) => {
        map[user.openid] = {
          nickname: user.nickname || '匿名用户',
          username: user.nickname || 'anonymous',
          avatar: user.avatar || '/images/user-avatar.jpg',
          isVerified: user.isVerified || false,
          signature: user.signature || ''
        }
        return map
      }, {})
    }
    
    // 为视频添加正确的作者信息
    const videosWithAuthor = result.data.map(video => {
      const author = usersMap[video.openid] || {
        nickname: '匿名用户',
        username: 'anonymous',
        avatar: '/images/user-avatar.jpg',
        isVerified: false,
        signature: ''
      }
      
      return {
        ...video,
        author,
        // 确保必要字段存在
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0,
        views: video.views || 0,
        tags: video.tags || [],
        // 添加poster字段映射，确保前端能正确获取缩略图
        poster: video.posterUrl || 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=200&h=300&fit=crop'
      }
    })
    
    // 获取总数
    const countResult = await query.count()
    
    return {
      success: true,
      data: {
        videos: videosWithAuthor,
        total: countResult.total,
        page,
        limit,
        hasMore: countResult.total > page * limit
      }
    }
    
  } catch (error) {
    console.error('获取视频列表失败:', error)
    return {
      success: false,
      error: error.message || '获取视频列表失败'
    }
  }
} 
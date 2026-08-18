const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 发布视频
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { videoUrl, posterUrl, title, description, tags, location, generatePoster = true } = event
    
    if (!videoUrl || !title) {
      return {
        success: false,
        error: '视频地址和标题不能为空'
      }
    }
    
    let finalPosterUrl = posterUrl || '';
    
    // 如果没有提供缩略图且需要生成，调用缩略图生成云函数
    if (!posterUrl && generatePoster && videoUrl) {
      try {
        console.log('开始生成视频缩略图...');
        
        const posterResult = await cloud.callFunction({
          name: 'generateVideoPoster',
          data: {
            videoFileID: videoUrl
          }
        });
        
        if (posterResult.result && posterResult.result.success) {
          finalPosterUrl = posterResult.result.data.posterUrl;
          console.log('缩略图生成成功:', finalPosterUrl);
        } else {
          console.log('缩略图生成失败，使用空值');
        }
        
      } catch (posterError) {
        console.error('调用缩略图生成云函数失败:', posterError);
        // 继续发布流程，不因为缩略图失败而中断
      }
    }
    
    // 获取当前时间
    const now = new Date()
    
    // 创建视频记录
    const videoData = {
      videoUrl,
      posterUrl: finalPosterUrl, // 视频缩略图
      title,
      description: description || '',
      tags: tags || [],
      location: location || '',
      openid: wxContext.OPENID,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      createTime: now,
      updateTime: now,
      status: 'published' // published, draft, deleted
    }
    
    const result = await db.collection('cursor_videos').add({
      data: videoData
    })
    
    return {
      success: true,
      data: {
        videoId: result._id,
        posterGenerated: finalPosterUrl !== (posterUrl || ''),
        ...videoData
      }
    }
    
  } catch (error) {
    console.error('发布视频失败:', error)
    return {
      success: false,
      error: error.message || '发布视频失败'
    }
  }
} 
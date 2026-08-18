const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  try {
    console.log('获取用户档案，openid:', openid);
    
    if (!openid) {
      return {
        success: false,
        error: '无法获取用户身份，请在小程序中使用',
        errorCode: 'NO_OPENID'
      };
    }
    
    // 查询用户基本信息
    let userInfo = null;
    const userResult = await db.collection('cursor_users').where({
      openid: openid
    }).get();
    
    if (userResult.data && userResult.data.length > 0) {
      userInfo = userResult.data[0];
    } else {
      // 如果用户不存在，创建默认用户信息
      const defaultUser = {
        openid: openid,
        nickname: '新用户',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        signature: '这个人很懒，什么都没留下~',
        followersCount: 0,
        followingCount: 0,
        likesCount: 0,
        isVerified: false,
        createTime: new Date(),
        updateTime: new Date()
      };
      
      const createResult = await db.collection('cursor_users').add({
        data: defaultUser
      });
      
      userInfo = {
        ...defaultUser,
        _id: createResult._id
      };
      
      console.log('创建新用户成功:', userInfo);
    }
    
    // 查询用户发布的视频
    console.log('查询用户发布的视频，openid:', openid);
    const myVideosResult = await db.collection('cursor_videos')
      .where({
        openid: openid
      })
      .orderBy('createTime', 'desc')
      .get();
    
    const myVideos = myVideosResult.data || [];
    console.log('找到用户发布的视频数量:', myVideos.length);
    console.log('用户发布的视频详情:', myVideos);
    
    // 计算用户获得的总点赞数
    const totalLikes = myVideos.reduce((sum, video) => sum + (video.likes || 0), 0);
    
    // 如果获赞数有变化，更新用户信息
    if (userInfo.likesCount !== totalLikes) {
      await db.collection('cursor_users').doc(userInfo._id).update({
        data: {
          likesCount: totalLikes,
          updateTime: new Date()
        }
      });
      userInfo.likesCount = totalLikes;
    }
    
    // 查询用户喜欢的视频（这里简化处理，实际应该有专门的用户喜欢记录表）
    // 暂时返回随机几个视频作为喜欢的视频
    const likedVideosResult = await db.collection('cursor_videos')
      .where({
        openid: db.command.neq(openid) // 排除自己发布的视频
      })
      .limit(10)
      .get();
    
    const likedVideos = (likedVideosResult.data || []).slice(0, 3); // 取前3个作为示例
    
    // 收藏的视频（同样简化处理）
    const collectedVideos = (likedVideosResult.data || []).slice(3, 5); // 取2个作为示例
    
    // 格式化视频数据
    const formatVideos = (videos, isMyVideos = false) => {
      return videos.map(video => ({
        id: video._id,
        _id: video._id,
        poster: video.posterUrl || 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=200&h=300&fit=crop', // 使用posterUrl字段
        posterUrl: video.posterUrl || 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=200&h=300&fit=crop', // 同时保留posterUrl字段用于兼容
        likes: video.likes || 0,
        duration: video.duration || '00:15',
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        createTime: video.createTime,
        // 如果是用户自己的视频，添加作者信息
        author: isMyVideos ? {
          openid: userInfo.openid,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar
        } : (video.author || {
          nickname: '匿名用户',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
        })
      }));
    };
    
    return {
      success: true,
      data: {
        userInfo: {
          _id: userInfo._id,
          openid: userInfo.openid,
          nickname: userInfo.nickname,
          avatar: userInfo.avatar,
          signature: userInfo.signature,
          followersCount: userInfo.followersCount || 0,
          followingCount: userInfo.followingCount || 0,
          likesCount: userInfo.likesCount || 0,
          isVerified: userInfo.isVerified || false
        },
        videoList: formatVideos(myVideos, true), // true表示是用户自己的视频
        likedVideos: formatVideos(likedVideos, false),
        collectedVideos: formatVideos(collectedVideos, false),
        stats: {
          myVideosCount: myVideos.length,
          likedVideosCount: likedVideos.length,
          collectedVideosCount: collectedVideos.length
        }
      }
    };
    
  } catch (error) {
    console.error('获取用户档案失败:', error);
    return {
      success: false,
      error: error.message || '获取用户档案失败',
      errorCode: error.code || 'UNKNOWN_ERROR'
    };
  }
}; 
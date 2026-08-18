Page({
  data: {
    currentIndex: 0,
    isPlaying: true, // 播放状态
    videoList: [],
    loading: false,  // 初始化时不应该是loading状态
    hasMore: true,
    page: 1,
    pageSize: 10,
    isFirstLoad: true  // 标记是否首次加载
  },

  onLoad() {
    console.log('=== 首页onLoad开始 ===');
    console.log('wx.cloud 状态:', !!wx.cloud);
    
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('网络类型:', res.networkType);
        if (res.networkType === 'none') {
          this.setData({ loading: false });
          wx.showModal({
            title: '网络错误',
            content: '当前无网络连接，请检查网络设置',
            showCancel: false
          });
          return;
        }
        // 网络正常，开始加载数据
        console.log('网络正常，开始加载数据...');
        this.loadVideoList(false);
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err);
        // 即使获取网络状态失败，也尝试加载数据
        console.log('网络状态获取失败，但仍尝试加载数据...');
        this.loadVideoList(false);
      }
    });
  },

  
  


  onShow() {
    console.log('📱 首页onShow，当前视频索引:', this.data.currentIndex);
    // 页面显示时播放当前视频
    if (this.data.videoList.length > 0) {
      this.setData({ isPlaying: true });
      setTimeout(() => {
        this.playVideo();
      }, 300);
    }
  },

  onHide() {
    // 页面隐藏时暂停所有视频
    this.pauseAllVideos();
  },

  // 加载视频列表
  async loadVideoList(refresh = false) {
    console.log('=== 开始加载视频列表 ===');
    console.log('refresh:', refresh);
    console.log('当前页码:', this.data.page);
    console.log('loading状态:', this.data.loading);
    console.log('isFirstLoad:', this.data.isFirstLoad);
    
    // 防止重复加载（除非是刷新或首次加载）
    if (this.data.loading && !refresh && !this.data.isFirstLoad) {
      console.log('已在加载中，跳过重复请求');
      return;
    }
    
    // 设置加载状态
    this.setData({ 
      loading: true,
      isFirstLoad: false  // 标记已经开始加载
    });
    
    try {
      // 确保云开发已初始化
      if (!wx.cloud) {
        throw new Error('wx.cloud 对象不存在，请检查云开发配置');
      }
      
      const requestData = {
        page: refresh ? 1 : this.data.page,
        limit: this.data.pageSize,
        type: 'all'
      };
      
      console.log('📡 调用云函数getVideos，参数:', requestData);
      
      const result = await wx.cloud.callFunction({
        name: 'getVideos',
        data: requestData
      });
      
      console.log('✅ 云函数调用成功，结果:', result);
      
      // 检查返回结果格式
      if (!result || !result.result) {
        throw new Error('云函数返回格式错误：缺少result字段');
      }
      
      if (!result.result.success) {
        throw new Error(result.result.error || '云函数执行失败');
      }
      
      const responseData = result.result.data;
      if (!responseData) {
        throw new Error('云函数返回数据为空');
      }
      
      const newVideos = (responseData.videos || []).map(video => ({
        ...video,
        // 将posterUrl映射为poster用于video组件的poster属性
        poster: video.posterUrl || ''
      }));
      const hasMore = responseData.hasMore || false;
      
      console.log('📊 获取到视频数据:', {
        newVideosCount: newVideos.length,
        hasMore: hasMore,
        totalInDB: responseData.total,
        firstVideoPoster: newVideos[0]?.poster || '无缩略图'
      });
      
      let videoList;
      if (refresh) {
        videoList = newVideos;
      } else {
        videoList = [...this.data.videoList, ...newVideos];
      }
      
      // 判断是否是首次加载
      const isFirstLoad = !refresh && this.data.videoList.length === 0;
      
      this.setData({
        videoList,
        hasMore,
        page: refresh ? 2 : this.data.page + 1,
        loading: false,
        // 确保首次加载时设置正确的播放状态
        ...(isFirstLoad && videoList.length > 0 ? { 
          currentIndex: 0, 
          isPlaying: true 
        } : {})
      }, () => {
        console.log('🎉 视频列表更新完成:', {
          totalVideos: videoList.length,
          nextPage: this.data.page,
          hasMore: hasMore,
          isFirstLoad
        });
        
        // 自动播放逻辑
        if (videoList.length > 0) {
          if (refresh && this.data.currentIndex === 0) {
            // 刷新时如果在第一个视频，重新播放
            setTimeout(() => {
              this.playVideo();
            }, 500);
          } else if (isFirstLoad) {
            // 首次加载时自动播放第一个视频
            setTimeout(() => {
              console.log('🎬 首次加载完成，开始自动播放第一个视频');
              this.playVideo();
            }, 600); // 给页面渲染时间
          }
        }
      });
      
    } catch (error) {
      console.error('❌ 加载视频列表失败:', error);
      console.error('错误详情:', {
        message: error.message,
        errCode: error.errCode,
        errMsg: error.errMsg,
        stack: error.stack
      });
      
      this.setData({ loading: false });
      
      // 显示详细错误信息
      const errorMessage = error.errMsg || error.message || '未知错误';
      wx.showModal({
        title: '加载失败',
        content: `无法加载视频列表\n错误: ${errorMessage}`,
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            setTimeout(() => {
              this.loadVideoList(refresh);
            }, 1000);
          }
        }
      });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadVideoList(true);
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  async onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      await this.loadVideoList();
    }
  },

  // 播放当前视频
  playVideo() {
    if (this.data.videoList.length === 0) {
      console.log('⚠️ 无视频列表，跳过播放');
      return;
    }
    
    console.log(`🎬 开始播放视频，索引: ${this.data.currentIndex}，总数: ${this.data.videoList.length}`);
    
    const videoContext = wx.createVideoContext(`video-${this.data.currentIndex}`, this);
    if (videoContext) {
      videoContext.play();
      this.setData({
        isPlaying: true
      });
      console.log('✅ 视频播放指令已发出');
    } else {
      console.error('❌ 无法获取视频上下文，videoId:', `video-${this.data.currentIndex}`);
    }
  },

  // 暂停所有视频
  pauseAllVideos() {
    this.data.videoList.forEach((item, index) => {
      const videoContext = wx.createVideoContext(`video-${index}`, this);
      if (videoContext) {
        videoContext.pause();
      }
    });
    this.setData({
      isPlaying: false
    });
  },

  // 暂停当前视频
  pauseCurrentVideo() {
    const videoContext = wx.createVideoContext(`video-${this.data.currentIndex}`, this);
    if (videoContext) {
      videoContext.pause();
      this.setData({
        isPlaying: false
      });
    }
  },

  // 滑动切换视频
  onSwiperChange(e) {
    const currentIndex = e.detail.current;
    this.pauseAllVideos();
    this.setData({
      currentIndex,
      isPlaying: true
    }, () => {
      setTimeout(() => {
        this.playVideo();
      }, 200);
    });
    
    // 预加载更多视频（滑到倒数第3个时）
    if (currentIndex >= this.data.videoList.length - 3 && this.data.hasMore && !this.data.loading) {
      this.loadVideoList();
    }
  },

  // 点赞
  async onLike(e) {
    const index = e.currentTarget.dataset.index;
    const video = this.data.videoList[index];
    
    if (!video) return;
    
    // 立即更新UI
    const videoList = [...this.data.videoList];
    videoList[index].isLiked = !videoList[index].isLiked;
    videoList[index].likes += videoList[index].isLiked ? 1 : -1;
    
    this.setData({ videoList });

    // 显示点赞动画
    wx.showToast({
      title: videoList[index].isLiked ? '❤️' : '💔',
      icon: 'none',
      duration: 500
    });
    
    // TODO: 调用云函数更新点赞状态到数据库
    try {
      await wx.cloud.callFunction({
        name: 'updateVideoLike',
        data: {
          videoId: video._id,
          isLiked: videoList[index].isLiked
        }
      });
    } catch (error) {
      console.error('更新点赞状态失败:', error);
      // 如果更新失败，回滚UI状态
      videoList[index].isLiked = !videoList[index].isLiked;
      videoList[index].likes += videoList[index].isLiked ? 1 : -1;
      this.setData({ videoList });
    }
  },

  // 评论
  onComment(e) {
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
    });
  },

  // 分享
  onShare(e) {
    const index = e.currentTarget.dataset.index;
    const video = this.data.videoList[index];
    
    return {
      title: video.title || video.description || '精彩视频分享',
      path: `/pages/video/video?id=${video._id}`,
      imageUrl: video.poster || ''
    };
  },

  // 关注用户
  onFollow(e) {
    wx.showToast({
      title: '关注成功！',
      icon: 'success'
    });
  },

  // 查看用户主页
  onUserProfile(e) {
    const username = e.currentTarget.dataset.username;
    wx.showToast({
      title: `查看${username}的主页`,
      icon: 'none'
    });
  },

  // 点击视频播放/暂停切换
  onVideoTap() {
    if (this.data.isPlaying) {
      this.pauseCurrentVideo();
    } else {
      this.playVideo();
    }
  },

  // 视频开始播放事件
  onVideoPlay(e) {
    console.log('🎬 视频开始播放事件触发');
    this.setData({ isPlaying: true });
  },

  // 视频暂停事件
  onVideoPause(e) {
    console.log('⏸️ 视频暂停事件触发');
    this.setData({ isPlaying: false });
  },

  // 重试加载
  onRetry() {
    console.log('手动重试加载');
    this.setData({
      page: 1,
      videoList: [],
      hasMore: true,
      isFirstLoad: true
    });
    this.loadVideoList(true);
  },

  // 分享到朋友圈
  onShareTimeline() {
    const currentVideo = this.data.videoList[this.data.currentIndex];
    if (currentVideo) {
      return {
        title: currentVideo.title || currentVideo.description || '精彩视频分享'
      };
    }
  },

  // 调试方法：手动测试云函数
  debugTestCloudFunction() {
    console.log('=== 手动测试云函数 ===');
    wx.cloud.callFunction({
      name: 'getVideos',
      data: { page: 1, limit: 5, type: 'all' }
    }).then(result => {
      console.log('✅ 手动测试成功:', result);
      wx.showModal({
        title: '测试成功',
        content: `获取到 ${result.result.data.videos.length} 个视频`,
        showCancel: false
      });
    }).catch(error => {
      console.error('❌ 手动测试失败:', error);
      wx.showModal({
        title: '测试失败',
        content: error.message || error.errMsg || '未知错误',
        showCancel: false
      });
    });
  }
}); 
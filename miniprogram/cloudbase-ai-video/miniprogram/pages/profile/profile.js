Page({
  data: {
    userInfo: {
      avatar: '',
      nickname: '加载中...',
      signature: '',
      followersCount: 0,
      followingCount: 0,
      likesCount: 0,
      isVerified: false
    },
    tabIndex: 0,
    tabList: ['作品', '喜欢', '收藏'],
    videoList: [],
    likedVideos: [],
    collectedVideos: [],
    loading: false,
    currentOpenId: '',
    stats: {
      myVideosCount: 0,
      likedVideosCount: 0,
      collectedVideosCount: 0
    }
  },

  async onLoad() {
    await this.loadUserProfile();
  },

  async onShow() {
    // 每次显示页面时刷新数据（可能用户发布了新视频或获得了新的点赞）
    await this.loadUserProfile();
  },

  // 加载用户档案数据
  async loadUserProfile() {
    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'getUserProfile',
        data: {}
      });

      if (!result || !result.result) {
        throw new Error('云函数返回格式错误');
      }

      if (!result.result.success) {
        throw new Error(result.result.error || '获取用户档案失败');
      }

      const data = result.result.data;
      
      // 确保视频数据包含正确的缩略图字段
      const processVideoList = (videos) => {
        return (videos || []).map(video => ({
          ...video,
          poster: video.poster || video.posterUrl || 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=200&h=300&fit=crop'
        }));
      };

      this.setData({
        userInfo: data.userInfo,
        videoList: processVideoList(data.videoList),
        likedVideos: processVideoList(data.likedVideos),
        collectedVideos: processVideoList(data.collectedVideos),
        stats: data.stats || {},
        currentOpenId: data.userInfo.openid,
        loading: false
      });

    } catch (error) {
      this.setData({ loading: false });
      
      wx.showModal({
        title: '加载失败',
        content: `无法加载个人信息\n错误: ${error.message || error.errMsg || '未知错误'}`,
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            setTimeout(() => {
              this.loadUserProfile();
            }, 1000);
          }
        }
      });
    }
  },

  // 切换标签页
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      tabIndex: index
    });
  },

  // 编辑资料
  editProfile() {
    // 显示编辑昵称的输入框
    wx.showModal({
      title: '编辑昵称',
      content: '请输入新的昵称',
      editable: true,
      placeholderText: this.data.userInfo.nickname,
      success: async (res) => {
        if (res.confirm && res.content) {
          await this.updateNickname(res.content.trim());
        }
      }
    });
  },

  // 更新昵称
  async updateNickname(newNickname) {
    if (!newNickname || newNickname === this.data.userInfo.nickname) {
      return;
    }

    if (newNickname.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({ title: '更新中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          nickname: newNickname
        }
      });

      if (result.result.success) {
        // 更新本地数据
        this.setData({
          'userInfo.nickname': newNickname
        });

        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.result.error || '更新失败');
      }

    } catch (error) {
      wx.showModal({
        title: '更新失败',
        content: error.message || error.errMsg || '更新昵称失败',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 编辑个性签名
  editSignature() {
    wx.showModal({
      title: '编辑个性签名',
      content: '请输入新的个性签名',
      editable: true,
      placeholderText: this.data.userInfo.signature || '这个人很懒，什么都没留下~',
      success: async (res) => {
        if (res.confirm) {
          await this.updateSignature(res.content ? res.content.trim() : '');
        }
      }
    });
  },

  // 更新个性签名
  async updateSignature(newSignature) {
    if (newSignature === this.data.userInfo.signature) {
      return;
    }

    if (newSignature.length > 50) {
      wx.showToast({
        title: '个性签名不能超过50个字符',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({ title: '更新中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'updateUserProfile',
        data: {
          signature: newSignature || '这个人很懒，什么都没留下~'
        }
      });

      if (result.result.success) {
        // 更新本地数据
        this.setData({
          'userInfo.signature': newSignature || '这个人很懒，什么都没留下~'
        });

        wx.showToast({
          title: '签名更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.result.error || '更新失败');
      }

    } catch (error) {
      wx.showModal({
        title: '更新失败',
        content: error.message || error.errMsg || '更新个性签名失败',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 设置
  openSettings() {
    wx.showActionSheet({
      itemList: ['账号设置', '隐私设置', '通知设置', '关于我们'],
      success: (res) => {
        const items = ['账号设置', '隐私设置', '通知设置', '关于我们'];
        wx.showModal({
          title: items[res.tapIndex],
          content: `${items[res.tapIndex]}功能开发中，敬请期待！`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  // 查看粉丝
  viewFollowers() {
    wx.showModal({
      title: '粉丝列表',
      content: `您目前有 ${this.data.userInfo.followersCount} 个粉丝\n粉丝列表功能开发中`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 查看关注
  viewFollowing() {
    wx.showModal({
      title: '关注列表',
      content: `您目前关注了 ${this.data.userInfo.followingCount} 个用户\n关注列表功能开发中`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 查看获赞
  viewLikes() {
    wx.showModal({
      title: '获赞详情',
      content: `您的作品总共获得了 ${this.data.userInfo.likesCount} 个赞\n获赞详情功能开发中`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 图片加载成功
  onImageLoad(e) {
    // 图片加载成功，无需处理
  },

  // 图片加载失败
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    
    // 尝试使用备用图片
    const fallbackImage = 'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=200&h=300&fit=crop';
    
    this.setData({
      [`videoList[${index}].poster`]: fallbackImage
    });
    
    wx.showToast({
      title: `图片${index + 1}加载失败，已替换`,
      icon: 'none',
      duration: 2000
    });
  },

  // 播放视频
  playVideo(e) {
    const videoId = e.currentTarget.dataset.id;
    const currentList = this.getCurrentVideoList();
    const video = currentList.find(v => v._id === videoId);
    
    if (!video) {
      wx.showToast({
        title: '视频不存在',
        icon: 'error'
      });
      return;
    }
    
    // 这里可以跳转到视频播放页面，或者跳转到首页对应的视频
    wx.showModal({
      title: '播放视频',
      content: `即将播放视频: ${video.title || '无标题'}\n视频播放功能开发中`,
      showCancel: true,
      cancelText: '取消',
      confirmText: '去首页看',
      success: (res) => {
        if (res.confirm) {
          // 跳转到首页
          wx.switchTab({
            url: '/pages/home/home'
          });
        }
      }
    });
  },

  // 刷新数据
  async onRefresh() {
    await this.loadUserProfile();
    wx.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1500
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `${this.data.userInfo.nickname}的个人主页`,
      path: '/pages/profile/profile'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `${this.data.userInfo.nickname}的个人主页`
    };
  },

  // 获取当前显示的视频列表
  getCurrentVideoList() {
    const { tabIndex, videoList, likedVideos, collectedVideos } = this.data;
    switch (tabIndex) {
      case 0: return videoList;
      case 1: return likedVideos;
      case 2: return collectedVideos;
      default: return videoList;
    }
  }
}); 
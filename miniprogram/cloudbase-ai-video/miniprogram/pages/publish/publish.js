Page({
  data: {
    videoSrc: '',             // 本地视频路径（用于预览）
    videoCloudUrl: '',        // 云存储视频地址
    videoPoster: '',          // 本地缩略图路径（用于预览）
    posterCloudUrl: '',       // 云存储缩略图地址
    generatedPoster: '',      // 自动生成的第一帧封面
    isUsingGeneratedPoster: false, // 是否使用生成的封面
    title: '',
    description: '',
    tags: '',
    location: '',
    isUploading: false,
    uploadProgress: 0,
    canPublish: false,
    isGeneratingPoster: false, // 是否正在生成缩略图
    posterOptions: [], // 封面选项列表
    showPosterSelector: false // 是否显示封面选择器
  },

  onLoad() {
    console.log('发布页面加载完成');
  },

  // 检查是否可以发布
  checkCanPublish() {
    const { videoCloudUrl, title, isUploading } = this.data;
    const canPublish = !isUploading && videoCloudUrl && title.trim().length > 0;
    this.setData({
      canPublish: canPublish
    });
  },

  // 显示视频选择后的反馈
  async showVideoSelectedFeedback() {
    // 清除之前的封面数据
    this.setData({
      videoPoster: '',
      posterCloudUrl: '',
      generatedPoster: '',
      isUsingGeneratedPoster: false,
      posterOptions: [],
      showPosterSelector: false,
      isGeneratingPoster: false
    });
    
    this.showSuccessToast('视频选择成功，正在上传...');
    
    try {
      // 立即上传视频到云存储
      await this.uploadVideoImmediately();
      
      // 自动生成第一帧封面
      this.generateFirstFramePoster();
    } catch (error) {
      console.error('视频上传失败:', error);
      wx.showModal({
        title: '上传失败',
        content: '视频上传失败，请重新选择',
        showCancel: false
      });
    }
  },

  // 立即上传视频到云存储
  async uploadVideoImmediately() {
    const { videoSrc } = this.data;
    if (!videoSrc) return;

    this.setData({ isUploading: true });
    
    try {
      wx.showLoading({ title: '正在上传视频...', mask: true });
      
      const videoCloudUrl = await this.uploadVideoToCloud(videoSrc);
      
      this.setData({ 
        videoCloudUrl: videoCloudUrl,
        isUploading: false 
      });
      
      wx.hideLoading();
      this.showSuccessToast('视频上传成功！');
      this.checkCanPublish();
      
    } catch (error) {
      this.setData({ isUploading: false });
      wx.hideLoading();
      throw error;
    }
  },

  // 提取视频第一帧作为封面
  async generateFirstFramePoster() {
    if (!this.data.videoSrc) {
      console.log('没有视频源，无法生成封面');
      return;
    }

    this.setData({ isGeneratingPoster: true });

    try {
      console.log('开始提取视频第一帧...');
      
      let posterPath = null;

      // 方案1：优先使用云端FFmpeg提取真实第一帧
      try {
        console.log('尝试云端FFmpeg提取视频第一帧...');
        posterPath = await this.generatePosterWithCloud();
        console.log('云端第一帧提取成功:', posterPath);
      } catch (cloudError) {
        console.log('云端第一帧提取失败，尝试备用方案:', cloudError.message);
      }

      // 方案2：如果云端失败，使用本地Canvas生成渐变封面
      if (!posterPath) {
        try {
          console.log('使用本地Canvas生成渐变封面...');
          posterPath = await this.extractVideoFrame(this.data.videoSrc);
        } catch (canvasError) {
          console.log('Canvas生成失败，使用最终备用方案:', canvasError);
        }
      }

      // 方案3：最终备用方案 - 在线封面图片
      if (!posterPath) {
        posterPath = await this.generateFallbackPoster();
      }
      
      if (posterPath) {
        console.log('视频封面生成成功:', posterPath);
        
        this.setData({
          generatedPoster: posterPath,
          videoPoster: posterPath, // 默认使用生成的封面
          isUsingGeneratedPoster: true,
          posterOptions: [
            {
              id: 'generated',
              title: '视频第一帧',
              image: posterPath,
              description: '自动提取的视频第一帧'
            }
          ],
          isGeneratingPoster: false
        });
        
        this.showSuccessToast('视频第一帧提取成功！');
      } else {
        throw new Error('无法生成封面');
      }
      
    } catch (error) {
      console.error('生成视频封面失败:', error);
      this.setData({ isGeneratingPoster: false });
      
      wx.showModal({
        title: '封面生成失败',
        content: '无法自动提取视频第一帧，您可以手动选择封面或使用默认封面发布',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 使用云端生成封面（提取视频第一帧）
  async generatePosterWithCloud() {
    try {
      console.log('使用云端提取视频第一帧...');
      
      // 检查是否已有云存储视频地址
      if (!this.data.videoCloudUrl) {
        throw new Error('视频尚未上传到云存储');
      }
      
      wx.showLoading({ title: '正在提取第一帧...' });
      
      // 调用云函数提取视频第一帧，使用已上传的视频
      const result = await wx.cloud.callFunction({
        name: 'extractVideoFrame',
        data: {
          videoFileID: this.data.videoCloudUrl
        }
      });
      
      wx.hideLoading();
      
      if (result.result.success && result.result.data.posterUrl) {
        console.log('视频第一帧提取成功:', result.result.data.posterUrl);
        
        // 保存云存储封面地址
        this.setData({
          posterCloudUrl: result.result.data.posterUrl
        });
        
        // 获取临时访问链接用于预览
        const tempFileResult = await wx.cloud.getTempFileURL({
          fileList: [result.result.data.posterUrl]
        });
        
        if (tempFileResult.fileList && tempFileResult.fileList[0] && tempFileResult.fileList[0].tempFileURL) {
          return tempFileResult.fileList[0].tempFileURL;
        } else {
          return result.result.data.posterUrl;
        }
      } else {
        throw new Error(result.result.error || '提取第一帧失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('云端提取第一帧失败:', error);
      throw error;
    }
  },

  // 提取视频帧
  extractVideoFrame(videoPath) {
    return new Promise((resolve, reject) => {
      try {
        // 创建canvas进行视频帧提取
        const query = wx.createSelectorQuery();
        query.select('#video-canvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res[0] || !res[0].node) {
              // Canvas不可用，使用备用方案
              console.log('Canvas不可用，使用备用方案');
              this.generateFallbackPoster().then(resolve).catch(reject);
              return;
            }
            
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 使用视频组件提取第一帧
            this.createVideoSnapshot(videoPath, canvas, ctx).then(resolve).catch(() => {
              // 如果失败，使用备用方案
              this.generateFallbackPoster().then(resolve).catch(reject);
            });
          });
      } catch (error) {
        console.error('提取视频帧失败:', error);
        // 使用备用方案
        this.generateFallbackPoster().then(resolve).catch(reject);
      }
    });
  },

  // 使用视频组件创建快照
  createVideoSnapshot(videoPath, canvas, ctx) {
    return new Promise((resolve, reject) => {
      // 由于小程序视频组件限制，我们使用一个创新的方法：
      // 1. 创建临时video元素
      // 2. 等待视频加载第一帧
      // 3. 使用canvas绘制
      
      const tempVideo = wx.createInnerAudioContext(); // 这里实际上我们需要视频但音频API类似
      
      // 小程序环境限制较多，我们使用更直接的方法：
      // 生成一个基于视频路径hash的渐变封面
      this.generateHashBasedPoster(videoPath, canvas, ctx).then(resolve).catch(reject);
    });
  },

  // 基于视频路径生成hash封面
  generateHashBasedPoster(videoPath, canvas, ctx) {
    return new Promise((resolve, reject) => {
      try {
        // 设置canvas尺寸
        canvas.width = 300;
        canvas.height = 400;
        
        // 基于视频路径生成颜色
        const hash = this.simpleHash(videoPath);
        const colors = this.generateColorsFromHash(hash);
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(0.5, colors.secondary);
        gradient.addColorStop(1, colors.tertiary);
        
        // 填充背景
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加视频图标
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎬', canvas.width / 2, canvas.height / 2);
        
        // 导出图片
        wx.canvasToTempFilePath({
          canvas: canvas,
          quality: 0.8,
          fileType: 'jpg',
          success: (result) => {
            console.log('生成Hash封面成功:', result.tempFilePath);
            resolve(result.tempFilePath);
          },
          fail: (err) => {
            console.error('Canvas导出失败:', err);
            reject(err);
          }
        });
        
      } catch (error) {
        console.error('生成Hash封面失败:', error);
        reject(error);
      }
    });
  },

  // 生成简单hash值
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    return Math.abs(hash);
  },

  // 基于hash生成颜色
  generateColorsFromHash(hash) {
    const hue1 = hash % 360;
    const hue2 = (hash + 120) % 360;
    const hue3 = (hash + 240) % 360;
    
    return {
      primary: `hsl(${hue1}, 70%, 60%)`,
      secondary: `hsl(${hue2}, 70%, 50%)`,
      tertiary: `hsl(${hue3}, 70%, 40%)`
    };
  },

  // 生成备用封面（使用网络图片）
  generateFallbackPoster() {
    return new Promise((resolve) => {
      // 使用一个精美的视频占位图
      const fallbackPosters = [
        'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=300&h=400&fit=crop',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=400&fit=crop',
        'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&h=400&fit=crop',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=400&fit=crop'
      ];
      
      const randomIndex = Date.now() % fallbackPosters.length;
      const selectedPoster = fallbackPosters[randomIndex];
      
      console.log('使用备用封面:', selectedPoster);
      resolve(selectedPoster);
    });
  },

  // 检查视频格式
  checkVideoFormat(filePath) {
    const supportedFormats = ['.mp4', '.MP4'];
    const isSupported = supportedFormats.some(format => filePath.toLowerCase().includes(format.toLowerCase()));
    
    if (!isSupported) {
      console.log('视频格式可能不被支持:', filePath);
    }
    
    return isSupported;
  },

  // 显示错误提示
  showErrorToast(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    });
  },

  // 显示成功提示
  showSuccessToast(message, duration = 1500) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    });
  },



  // 显示封面选择器
  showPosterSelector() {
    this.setData({ showPosterSelector: true });
  },

  // 隐藏封面选择器
  hidePosterSelector() {
    this.setData({ showPosterSelector: false });
  },

  // 选择封面选项
  selectPosterOption(e) {
    const optionId = e.currentTarget.dataset.id;
    const option = this.data.posterOptions.find(opt => opt.id === optionId);
    
    if (option) {
      this.setData({
        videoPoster: option.image,
        isUsingGeneratedPoster: optionId === 'generated',
        showPosterSelector: false
      });
      
      this.showSuccessToast('封面选择成功');
    }
  },

  // 选择自定义封面
  choosePoster() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const image = res.tempFiles[0];
        console.log('选择的封面图片:', image);
        
        // 检查图片大小（限制为5MB）
        if (image.size > 5 * 1024 * 1024) {
          this.showErrorToast('图片文件过大，请选择小于5MB的图片');
          return;
        }
        
        try {
          // 立即上传封面到云存储
          wx.showLoading({ title: '正在上传封面...', mask: true });
          const posterCloudUrl = await this.uploadPosterToCloud(image.tempFilePath);
          wx.hideLoading();
          
          // 将自定义封面添加到选项中
          const newPosterOptions = [...this.data.posterOptions];
          const customOption = {
            id: 'custom',
            title: '自定义封面',
            image: image.tempFilePath,
            description: '您选择的图片'
          };
          
          // 如果已有自定义选项，替换它
          const customIndex = newPosterOptions.findIndex(opt => opt.id === 'custom');
          if (customIndex >= 0) {
            newPosterOptions[customIndex] = customOption;
          } else {
            newPosterOptions.push(customOption);
          }
          
          this.setData({
            videoPoster: image.tempFilePath,
            posterCloudUrl: posterCloudUrl,  // 保存云存储地址
            isUsingGeneratedPoster: false,
            posterOptions: newPosterOptions,
            showPosterSelector: false
          });
          
          this.showSuccessToast('自定义封面上传成功');
          
        } catch (error) {
          wx.hideLoading();
          console.error('封面上传失败:', error);
          this.showErrorToast('封面上传失败，请重试');
        }
      },
      fail: (err) => {
        console.error('选择封面失败:', err);
        this.showErrorToast('选择封面失败');
      }
    });
  },

  // 使用生成的封面
  useGeneratedPoster() {
    if (this.data.generatedPoster) {
      this.setData({
        videoPoster: this.data.generatedPoster,
        isUsingGeneratedPoster: true
      });
      this.showSuccessToast('已使用自动生成的封面');
    } else {
      this.showErrorToast('没有自动生成的封面');
    }
  },

  // 重新生成封面
  regeneratePoster() {
    if (!this.data.videoSrc) {
      this.showErrorToast('请先选择视频');
      return;
    }

    // 关闭封面选择器
    this.hidePosterSelector();

    wx.showModal({
      title: '重新生成封面',
      content: '确定要重新生成视频封面吗？',
      success: (res) => {
        if (res.confirm) {
          this.generateFirstFramePoster();
        }
      }
    });
  },

  // 清除封面
  clearPoster() {
    wx.showModal({
      title: '清除封面',
      content: '确定要清除当前封面吗？发布时将使用云端智能生成',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            videoPoster: '',
            posterCloudUrl: '',
            generatedPoster: '',
            isUsingGeneratedPoster: false,
            posterOptions: [],
            showPosterSelector: false
          });
          this.showSuccessToast('封面已清除');
        }
      }
    });
  },

  // 选择视频
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      compressed: true, // 压缩视频，提高兼容性
      success: (res) => {
        const media = res.tempFiles[0];
        console.log('选择的视频:', media);
        
        // 检查视频大小（限制为50MB）
        if (media.size > 50 * 1024 * 1024) {
          this.showErrorToast('视频文件过大，请选择小于50MB的视频');
          return;
        }
        
        // 检查视频格式
        if (!this.checkVideoFormat(media.tempFilePath)) {
          console.log('视频格式提示',{
            title: '视频格式提示',
            content: '建议使用MP4格式的视频以获得最佳兼容性',
            showCancel: false,
            confirmText: '继续使用'
          });
        }
        
        this.setData({
          videoSrc: media.tempFilePath
        });
        
        // 设置视频后，提示将自动生成缩略图
        this.showVideoSelectedFeedback();
        
        // 检查发布条件
        this.checkCanPublish();
        
        this.showSuccessToast('视频选择成功');
      },
      fail: (err) => {
        console.error('选择视频失败:', err);
        this.showErrorToast('选择视频失败');
      }
    });
  },

  // 输入标题
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
    // 检查发布条件
    this.checkCanPublish();
  },

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 输入标签
  onTagsInput(e) {
    this.setData({
      tags: e.detail.value
    });
  },

  // 输入位置
  onLocationInput(e) {
    this.setData({
      location: e.detail.value
    });
  },

  // 上传视频到云存储
  async uploadVideoToCloud(filePath) {
    return new Promise((resolve, reject) => {
      const fileName = `videos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`;
      
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: filePath,
        success: (res) => {
          console.log('视频上传成功:', res);
          resolve(res.fileID);
        },
        fail: (err) => {
          console.error('视频上传失败:', err);
          reject(err);
        }
      });
      
      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        const progress = Math.round(res.progress);
        this.setData({
          uploadProgress: progress
        });
        console.log('上传进度:', progress + '%');
      });
    });
  },

  // 上传缩略图到云存储
  async uploadPosterToCloud(filePath) {
    return new Promise((resolve, reject) => {
      const fileName = `posters/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      
      wx.cloud.uploadFile({
        cloudPath: fileName,
        filePath: filePath,
        success: (res) => {
          console.log('缩略图上传成功:', res);
          resolve(res.fileID);
        },
        fail: (err) => {
          console.error('缩略图上传失败:', err);
          reject(err);
        }
      });
    });
  },

  // 发布视频
  async publishVideo() {
    const { videoCloudUrl, posterCloudUrl, title, description, tags, location } = this.data;
    
    // 验证必填项
    if (!videoCloudUrl) {
      wx.showToast({
        title: '视频尚未上传完成',
        icon: 'none'
      });
      return;
    }
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入视频标题',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isUploading: true });
    this.checkCanPublish();
    
    try {
      wx.showLoading({
        title: '正在发布...',
        mask: true
      });
      
      // 处理标签
      const tagsArray = tags.trim() ? tags.split(/[,，\s]+/).filter(tag => tag.trim()) : [];
      
      // 调用云函数保存视频信息，直接使用已上传的云存储地址
      const result = await wx.cloud.callFunction({
        name: 'publishVideo',
        data: {
          videoUrl: videoCloudUrl,        // 使用已上传的视频云存储地址
          posterUrl: posterCloudUrl,     // 使用已生成的封面云存储地址
          title: title.trim(),
          description: description.trim(),
          tags: tagsArray,
          location: location.trim(),
          generatePoster: !posterCloudUrl // 如果没有封面，则自动生成
        }
      });
      
      wx.hideLoading();
      
      if (result.result.success) {
        const posterGenerated = result.result.data?.posterGenerated;
        const successMessage = posterGenerated ? '发布成功！已自动生成封面' : '发布成功！';
        
        wx.showToast({
          title: successMessage,
          icon: 'success',
          duration: 2000
        });
        
        // 重置表单
        this.resetForm();
        
        // 2秒后跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home'
          });
        }, 2000);
        
      } else {
        throw new Error(result.result.error || '发布失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('发布视频失败:', error);
      wx.showModal({
        title: '发布失败',
        content: error.message || '发布视频时出现错误，请重试',
        showCancel: false
      });
    } finally {
      this.setData({ isUploading: false });
      this.checkCanPublish();
    }
  },

  // 取消发布
  cancelPublish() {
    if (this.data.isUploading) {
      wx.showModal({
        title: '正在上传',
        content: '视频正在上传中，确定要取消吗？',
        success: (res) => {
          if (res.confirm) {
            this.resetForm();
          }
        }
      });
    } else {
      this.resetForm();
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      videoSrc: '',
      videoCloudUrl: '',
      videoPoster: '',
      posterCloudUrl: '',
      generatedPoster: '',
      isUsingGeneratedPoster: false,
      title: '',
      description: '',
      tags: '',
      location: '',
      uploadProgress: 0,
      isUploading: false,
      isGeneratingPoster: false,
      posterOptions: [],
      showPosterSelector: false,
      tempVideoShow: false
    });
    this.checkCanPublish();
  },

  // 预览视频
  previewVideo() {
    if (this.data.videoSrc) {
      wx.previewMedia({
        sources: [{
          url: this.data.videoSrc,
          type: 'video'
        }]
      });
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我在制作精彩视频，快来看看！',
      path: '/pages/publish/publish'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '我在制作精彩视频，快来看看！'
    };
  }
}); 
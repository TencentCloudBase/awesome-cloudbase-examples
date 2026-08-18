Page({
  data: {
    // 加载状态
    loading: true,
    loadError: false,
    
    // 轮播图数据（保留静态数据）
    banners: [
      {
        id: 1,
        image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&h=400&fit=crop',
        title: '高效脱单指南',
        subtitle: '21天科学脱单方案'
      },
      {
        id: 2,
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
        title: '社交魅力提升',
        subtitle: '打造个人魅力，轻松脱单'
      },
      {
        id: 3,
        image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=400&fit=crop',
        title: '恋爱心理学',
        subtitle: '理解异性心理，提升成功率'
      }
    ],
    
    // 课程分类（保留静态数据，但需要匹配数据库中的分类）
    categories: [
      { id: 'all', name: '全部', icon: '🔥', active: true },
      { id: 'coffee', name: '咖啡约会', icon: '☕', active: false },
      { id: 'movie', name: '电影约会', icon: '🎬', active: false },
      { id: 'sports', name: '运动约会', icon: '🏃', active: false },
      { id: 'food', name: '美食制作', icon: '🍳', active: false },
      { id: 'art', name: '文化艺术', icon: '🎨', active: false },
      { id: 'music', name: '音乐体验', icon: '🎵', active: false },
      { id: 'shopping', name: '购物攻略', icon: '🛍️', active: false },
      { id: 'game', name: '游戏娱乐', icon: '🎮', active: false }
    ],
    
    // 课程数据（从云函数获取）
    courses: [],
    currentCategory: 'all' // 当前选中的分类
  },

  onLoad: function() {
    console.log('首页加载完成');
    this.loadCourses();
  },

  onShow: function() {
    // 每次显示页面时刷新课程数据（可能有新的预约状态变化）
    this.loadCourses();
  },

  onPullDownRefresh: function() {
    // 下拉刷新
    this.loadCourses();
  },

  /**
   * 加载课程数据
   */
  loadCourses: function() {
    this.setData({ loading: true, loadError: false });
    
    wx.cloud.callFunction({
      name: 'dating_getCourses',
      data: {
        category: this.data.currentCategory,
        limit: 20,
        offset: 0
      },
      success: (res) => {
        console.log('获取课程列表成功:', res);
        
        if (res.result && res.result.success) {
          this.setData({
            courses: res.result.data.courses,
            loading: false,
            loadError: false
          });
        } else {
          console.error('云函数返回错误:', res.result);
          this.setData({
            loading: false,
            loadError: true
          });
          wx.showToast({
            title: res.result?.error || '获取课程失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (error) => {
        console.error('调用云函数失败:', error);
    this.setData({
          loading: false,
          loadError: true
        });
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        // 停止下拉刷新
        wx.stopPullDownRefresh();
      }
    });
  },

  /**
   * 选择分类
   */
  selectCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    
    // 更新分类选中状态
    const categories = this.data.categories.map(item => ({
      ...item,
      active: item.id === categoryId
    }));
    
    this.setData({
      categories: categories,
      currentCategory: categoryId
    });
    
    // 重新加载课程数据
    this.loadCourses();
    
    console.log('选择分类：', categoryId);
  },

  /**
   * 重试加载
   */
  retryLoad: function() {
    this.loadCourses();
  },

  /**
   * 跳转到课程详情
   */
  goToCourseDetail: function(e) {
    const courseId = e.currentTarget.dataset.id;
    console.log('跳转到课程详情：', courseId);
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?courseId=${courseId}`
    });
  },

  onShareAppMessage: function() {
    return {
      title: '脱单课程 - 免费线下课程，科学脱单',
      path: '/pages/index/index'
    };
  }
});
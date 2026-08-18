Page({
  data: {
    courseDetail: null,
    loading: true,
    loadError: false,
    isBooked: false, // 是否已预约
    bookingLoading: false, // 预约操作加载状态
    courseId: null // 当前课程ID
  },

  onLoad: function(options) {
    const courseId = options.courseId;
    console.log('课程详情页加载，课程ID：', courseId);
    
    this.setData({ courseId });
    this.loadCourseDetail(courseId);
  },

  onShow: function() {
    // 每次显示页面时刷新课程详情（可能有预约状态变化）
    if (this.data.courseId) {
      this.loadCourseDetail(this.data.courseId);
    }
  },

  onPullDownRefresh: function() {
    // 下拉刷新
    if (this.data.courseId) {
      this.loadCourseDetail(this.data.courseId);
    }
  },

  /**
   * 加载课程详情
   */
  loadCourseDetail: function(courseId) {
    this.setData({ loading: true, loadError: false });
    
    wx.cloud.callFunction({
      name: 'dating_getCourseDetail',
      data: { courseId },
      success: (res) => {
        console.log('获取课程详情成功:', res);
    
        if (res.result && res.result.success) {
      this.setData({
            courseDetail: res.result.data,
            isBooked: res.result.data.isBooked,
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
            title: res.result?.error || '获取课程详情失败',
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
   * 重试加载
   */
  retryLoad: function() {
    if (this.data.courseId) {
      this.loadCourseDetail(this.data.courseId);
    }
  },

  /**
   * 预约课程
   */
  bookCourse: function() {
    if (this.data.isBooked) {
      wx.showToast({
        title: '您已预约过此课程',
        icon: 'none'
      });
      return;
    }

    if (this.data.bookingLoading) {
      return; // 防止重复点击
    }
    
    const courseDetail = this.data.courseDetail;
    if (courseDetail.currentStudents >= courseDetail.maxStudents) {
      wx.showToast({
        title: '课程已满，无法预约',
        icon: 'error'
      });
      return;
    }

    wx.showModal({
      title: '确认预约',
      content: `确定要预约"${courseDetail.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performBooking();
        }
      }
    });
  },

  /**
   * 执行预约操作
   */
  performBooking: function() {
    this.setData({ bookingLoading: true });
    
    wx.cloud.callFunction({
      name: 'dating_bookCourse',
      data: { courseId: this.data.courseId },
      success: (res) => {
        console.log('预约课程结果:', res);
        
        if (res.result && res.result.success) {
          // 预约成功，更新本地状态
          this.setData({
            isBooked: true,
            'courseDetail.currentStudents': this.data.courseDetail.currentStudents + 1,
            bookingLoading: false
          });
          
          wx.showToast({
            title: '预约成功！',
            icon: 'success'
          });
        } else {
          console.error('预约失败:', res.result);
          this.setData({ bookingLoading: false });
          wx.showToast({
            title: res.result?.error || '预约失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (error) => {
        console.error('预约云函数调用失败:', error);
        this.setData({ bookingLoading: false });
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 取消预约
   */
  cancelBooking: function() {
    if (!this.data.isBooked) {
      wx.showToast({
        title: '您还未预约此课程',
        icon: 'none'
      });
      return;
    }

    if (this.data.bookingLoading) {
      return; // 防止重复点击
    }

    wx.showModal({
      title: '取消预约',
      content: '确定要取消预约吗？',
      success: (res) => {
        if (res.confirm) {
          this.performCancelBooking();
        }
      }
    });
  },

  /**
   * 执行取消预约操作
   */
  performCancelBooking: function() {
    this.setData({ bookingLoading: true });
    
    wx.cloud.callFunction({
      name: 'dating_cancelBooking',
      data: { courseId: this.data.courseId },
      success: (res) => {
        console.log('取消预约结果:', res);
        
        if (res.result && res.result.success) {
          // 取消成功，更新本地状态
          this.setData({
            isBooked: false,
            'courseDetail.currentStudents': Math.max(0, this.data.courseDetail.currentStudents - 1),
            bookingLoading: false
          });
          
          wx.showToast({
            title: '已取消预约',
            icon: 'success'
          });
        } else {
          console.error('取消预约失败:', res.result);
          this.setData({ bookingLoading: false });
          wx.showToast({
            title: res.result?.error || '取消预约失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (error) => {
        console.error('取消预约云函数调用失败:', error);
        this.setData({ bookingLoading: false });
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 联系导师
   */
  contactInstructor: function() {
    const instructor = this.data.courseDetail?.instructor;
    if (instructor) {
    wx.showModal({
      title: '联系导师',
        content: `请添加导师微信：teacher_${instructor.name}`,
      showCancel: false
    });
    }
  },

  /**
   * 查看地图
   */
  showLocation: function() {
    const location = this.data.courseDetail?.location;
    if (location) {
    wx.showModal({
      title: '课程地址',
      content: location,
      confirmText: '复制地址',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: location,
            success: () => {
              wx.showToast({
                title: '地址已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
    }
  },

  onShareAppMessage: function() {
    const courseDetail = this.data.courseDetail;
    if (courseDetail) {
      return {
        title: `${courseDetail.title} - 免费线下课程`,
        path: `/pages/course-detail/course-detail?courseId=${this.data.courseId}`
      };
    }
    return {
      title: '脱单课程 - 免费线下课程',
      path: '/pages/index/index'
    };
  }
}); 
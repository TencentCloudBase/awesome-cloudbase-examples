Page({
  data: {
    // 用户信息
    userInfo: {
      name: '加载中...',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
      joinDate: '',
      totalCourses: 0,
      completedCourses: 0
    },
    
    // 已预约的课程
    bookedCourses: [],
    
    // 统计数据
    stats: [
      { label: '已预约课程', value: 0, icon: '📚' },
      { label: '已完成课程', value: 0, icon: '✅' },
      { label: '学习时长', value: '0小时', icon: '⏰' },
      { label: '积累经验', value: '新手', icon: '🎯' }
    ],

    // 加载状态
    loading: true,
    loadingBookings: true,
    
    // 用户是否已登录
    isLoggedIn: false
  },

  onLoad: function() {
    console.log('个人主页加载完成');
    this.initCloudBase();
  },

  onShow: function() {
    // 每次显示页面时刷新数据（可能从其他页面预约了新课程）
    if (this.data.isLoggedIn) {
      this.refreshBookedCourses();
    }
  },

  onPullDownRefresh: function() {
    if (this.data.isLoggedIn) {
      this.loadUserData();
    }
    wx.stopPullDownRefresh();
  },

  // 初始化云开发
  initCloudBase: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    wx.cloud.init({
      env: 'lowcode-2gp2855c5ce22e35'
    });
    
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const that = this;
    
    // 先尝试获取用户信息，如果失败则显示登录界面
    this.getUserInfo().then(() => {
      that.setData({ isLoggedIn: true, loading: false });
      that.loadUserData();
    }).catch(() => {
      // 需要登录，显示登录界面
      that.setData({ isLoggedIn: false, loading: false });
    });
  },

  // 执行登录（用户点击登录按钮时调用）
  performLogin: function() {
    const that = this;
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('获取用户信息成功', res);
        
        // 调用云函数进行登录
        wx.cloud.callFunction({
          name: 'dating_userLogin',
          data: {
            userInfo: res.userInfo
          },
          success: (loginRes) => {
            console.log('登录成功', loginRes);
            if (loginRes.result.success) {
              that.setData({ isLoggedIn: true });
              that.loadUserData();
            } else {
              wx.showToast({
                title: '登录失败',
                icon: 'error'
              });
            }
          },
          fail: (err) => {
            console.error('登录失败', err);
            wx.showToast({
              title: '登录失败',
              icon: 'error'
            });
          }
        });
      },
      fail: (err) => {
        console.log('用户拒绝授权', err);
        wx.showModal({
          title: '需要授权',
          content: '需要获取您的基本信息才能使用完整功能',
          showCancel: false
        });
      }
    });
  },

  // 获取用户信息
  getUserInfo: function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'dating_getUserInfo',
        success: (res) => {
          console.log('获取用户信息成功', res);
          if (res.result.success) {
            resolve(res.result.data);
          } else {
            reject(res.result.error);
          }
        },
        fail: (err) => {
          console.error('获取用户信息失败', err);
          reject(err);
        }
      });
    });
  },

  // 加载用户数据
  loadUserData: function() {
    const that = this;
    
    this.setData({ loading: true });
    
    // 获取用户信息
    this.getUserInfo().then((userInfo) => {
      that.setData({
        userInfo: {
          name: userInfo.nickName || '用户',
          avatar: userInfo.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
          joinDate: that.formatDate(userInfo.createTime),
          totalCourses: userInfo.totalBookings || 0,
          completedCourses: userInfo.completedBookings || 0
        },
        loading: false
      });
      
      // 更新统计数据
      that.updateStats(userInfo);
      
      // 获取预约课程
      that.refreshBookedCourses();
    }).catch((err) => {
      console.error('加载用户数据失败', err);
      that.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    });
  },

  // 刷新已预约课程
  refreshBookedCourses: function() {
    const that = this;
    
    this.setData({ loadingBookings: true });
    
    wx.cloud.callFunction({
      name: 'dating_getUserBookings',
      success: (res) => {
        console.log('获取预约课程成功', res);
        if (res.result.success) {
          const bookings = res.result.data.bookings || [];
          
          // 处理课程数据格式
          const formattedBookings = bookings.map(booking => ({
            id: booking.courseId,
            bookingId: booking._id,
            title: booking.courseTitle,
            subtitle: booking.courseSubtitle || '精品课程',
            image: booking.courseImage || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=240&fit=crop',
            instructor: {
              name: booking.instructorName || '专业导师',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face'
            },
            courseTime: booking.courseTime,
            courseTimeDisplay: that.formatDateTime(booking.courseTime),
            location: booking.courseLocation || '待定',
            locationShort: that.getShortLocation(booking.courseLocation),
            duration: booking.courseDuration || '2小时',
            status: that.getBookingStatus(booking),
            bookingDate: that.formatDate(booking.createTime)
          }));
          
          that.setData({
            bookedCourses: formattedBookings,
            loadingBookings: false
          });
          
          // 更新用户信息中的课程数量
          that.setData({
            'userInfo.totalCourses': formattedBookings.length,
            'userInfo.completedCourses': formattedBookings.filter(c => c.status === 'completed').length
          });
          
        } else {
          console.error('获取预约课程失败', res.result.error);
          that.setData({ loadingBookings: false });
        }
      },
      fail: (err) => {
        console.error('获取预约课程失败', err);
        that.setData({ loadingBookings: false });
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    });
  },

  // 更新统计数据
  updateStats: function(userInfo) {
    const totalHours = (userInfo.completedBookings || 0) * 2; // 假设每门课程2小时
    let experience = '新手';
    if (userInfo.completedBookings >= 5) {
      experience = '资深';
    } else if (userInfo.completedBookings >= 2) {
      experience = '进阶';
    }
    
    this.setData({
      stats: [
        { label: '已预约课程', value: userInfo.totalBookings || 0, icon: '📚' },
        { label: '已完成课程', value: userInfo.completedBookings || 0, icon: '✅' },
        { label: '学习时长', value: `${totalHours}小时`, icon: '⏰' },
        { label: '积累经验', value: experience, icon: '🎯' }
      ]
    });
  },

  // 编辑个人信息
  editProfile: function() {
    const that = this;
    
    wx.showModal({
      title: '编辑昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          // 调用云函数更新用户信息
          wx.cloud.callFunction({
            name: 'dating_updateUserInfo',
            data: {
              nickName: res.content.trim()
            },
            success: (updateRes) => {
              if (updateRes.result.success) {
                that.setData({
                  'userInfo.name': res.content.trim()
                });
                wx.showToast({
                  title: '更新成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: '更新失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              console.error('更新用户信息失败', err);
              wx.showToast({
                title: '更新失败',
                icon: 'error'
              });
            }
          });
        }
      }
    });
  },

  // 查看课程详情
  goToCourseDetail: function(e) {
    const courseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?courseId=${courseId}`
    });
  },

  // 取消预约
  cancelBooking: function(e) {
    const courseId = e.currentTarget.dataset.id;
    const course = this.data.bookedCourses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const that = this;
    
    wx.showModal({
      title: '取消预约',
      content: `确定要取消预约"${course.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          // 调用云函数取消预约
          wx.cloud.callFunction({
            name: 'dating_cancelBooking',
            data: {
              courseId: courseId
            },
            success: (cancelRes) => {
              if (cancelRes.result.success) {
                // 刷新预约课程列表
                that.refreshBookedCourses();
                wx.showToast({
                  title: '已取消预约',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: cancelRes.result.error || '取消失败',
                  icon: 'error'
                });
              }
            },
            fail: (err) => {
              console.error('取消预约失败', err);
              wx.showToast({
                title: '取消失败',
                icon: 'error'
              });
            }
          });
        }
      }
    });
  },

  // 联系客服
  contactService: function() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信：service_tuodan\n工作时间：9:00-21:00',
      confirmText: '复制微信',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'service_tuodan',
            success: () => {
              wx.showToast({
                title: '微信号已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  // 关于我们
  aboutUs: function() {
    wx.showModal({
      title: '关于我们',
      content: '脱单课程小程序\n专注线下免费课程\n科学脱单，告别单身',
      showCancel: false
    });
  },

  // 意见反馈
  feedback: function() {
    wx.showModal({
      title: '意见反馈',
      content: '请通过客服微信联系我们，感谢您的宝贵意见！',
      showCancel: false
    });
  },

  // 工具函数：格式化日期
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 工具函数：格式化日期时间
  formatDateTime: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  // 工具函数：获取简短地址
  getShortLocation: function(location) {
    if (!location) return '待定';
    // 提取地址中的区域信息
    const match = location.match(/(.{2,4}区)/);
    return match ? match[1] : location.substring(0, 10) + '...';
  },

  // 工具函数：获取预约状态
  getBookingStatus: function(booking) {
    if (booking.status === 'cancelled') return 'cancelled';
    
    const now = new Date();
    const courseTime = new Date(booking.courseTime);
    
    if (courseTime < now) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  },

  onShareAppMessage: function() {
    return {
      title: '脱单课程 - 免费线下课程，科学脱单',
      path: '/pages/index/index'
    };
  }
}); 
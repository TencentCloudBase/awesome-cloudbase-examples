Component({
  data: {
    currentTab: 0,
    tabList: [
      {
        pagePath: '/pages/home/home',
        text: '首页',
        index: 0
      },
      {
        pagePath: '/pages/publish/publish',
        text: '发布',
        index: 1
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        index: 2
      }
    ]
  },

  lifetimes: {
    attached() {
      this.updateCurrentTab();
    }
  },

  pageLifetimes: {
    show() {
      this.updateCurrentTab();
    }
  },

  methods: {
    // 更新当前选中的tab
    updateCurrentTab() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = '/' + currentPage.route;
      
      const currentIndex = this.data.tabList.findIndex(item => item.pagePath === route);
      if (currentIndex !== -1) {
        this.setData({
          currentTab: currentIndex
        });
      }
    },

    // 切换tab
    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      
      if (index === this.data.currentTab) {
        return; // 如果点击的是当前页面，不做任何操作
      }

      // 更新当前选中状态
      this.setData({
        currentTab: index
      });

      // 页面跳转 - 使用 switchTab 进行 tabBar 页面跳转
      wx.switchTab({
        url: path,
        fail: (err) => {
          console.error('页面跳转失败:', path, err);
          // 降级处理，使用 redirectTo
          wx.redirectTo({
            url: path
          });
        }
      });
    },

    // 特殊处理发布页面
    handlePublish() {
      this.switchTab({
        currentTarget: {
          dataset: {
            index: 1,
            path: '/pages/publish/publish'
          }
        }
      });
    }
  }
}); 
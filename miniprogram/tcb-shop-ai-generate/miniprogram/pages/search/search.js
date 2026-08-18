// 导入服务
import { searchProducts } from '../../services/product';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    keyword: '', // 搜索关键词
    searchHistory: [], // 搜索历史
    productList: [], // 搜索结果
    pageSize: 10, // 每页商品数量
    pageNum: 1, // 当前页码
    isLoading: false, // 是否正在加载
    hasMore: true, // 是否有更多数据
    showHistory: true, // 是否显示历史记录
    showEmpty: false, // 是否显示空结果
    hotKeywords: ['手机', '电脑', '耳机', '相机', '手表', '平板'], // 热门搜索关键词
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 如果有传入的关键词，直接搜索
    if (options.keyword) {
      this.setData({
        keyword: options.keyword
      });
      this.handleSearch();
    }
    
    // 获取本地存储的搜索历史
    this.loadSearchHistory();
  },

  /**
   * 加载搜索历史
   */
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || [];
      this.setData({
        searchHistory: history
      });
    } catch (error) {
      console.error('获取搜索历史失败', error);
    }
  },

  /**
   * 保存搜索历史
   */
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return;
    
    try {
      // 获取现有历史
      let history = wx.getStorageSync('searchHistory') || [];
      
      // 如果已存在，先移除
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 只保留最近10条
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      
      // 保存到本地
      wx.setStorageSync('searchHistory', history);
      
      // 更新页面数据
      this.setData({
        searchHistory: history
      });
    } catch (error) {
      console.error('保存搜索历史失败', error);
    }
  },

  /**
   * 清空搜索历史
   */
  clearSearchHistory() {
    try {
      wx.removeStorageSync('searchHistory');
      this.setData({
        searchHistory: []
      });
      wx.showToast({
        title: '已清空历史',
        icon: 'success'
      });
    } catch (error) {
      console.error('清空搜索历史失败', error);
    }
  },

  /**
   * 输入框内容变化事件
   */
  onInputChange(e) {
    const keyword = e.detail.value;
    this.setData({
      keyword,
      showHistory: keyword.length === 0
    });
  },

  /**
   * 输入框获取焦点事件
   */
  onInputFocus() {
    this.setData({
      showHistory: this.data.keyword.length === 0
    });
  },

  /**
   * 清除输入框内容
   */
  onClearInput() {
    this.setData({
      keyword: '',
      showHistory: true
    });
  },

  /**
   * 点击搜索按钮或回车事件
   */
  handleSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      });
      return;
    }

    // 保存搜索历史
    this.saveSearchHistory(keyword);

    // 重置搜索状态
    this.setData({
      productList: [],
      pageNum: 1,
      hasMore: true,
      showHistory: false,
      showEmpty: false
    });

    // 加载搜索结果
    this.loadSearchResults();
  },

  /**
   * 加载搜索结果
   */
  async loadSearchResults(isLoadMore = false) {
    const { keyword, pageNum, pageSize, isLoading, hasMore } = this.data;

    if (isLoading || (!isLoadMore && !hasMore)) {
      return;
    }

    this.setData({
      isLoading: true
    });

    try {
      // 搜索商品
      const result = await searchProducts(keyword, {
        page: pageNum,
        pageSize
      });

      // 更新商品列表
      const newList = isLoadMore 
        ? [...this.data.productList, ...result] 
        : result;

      this.setData({
        productList: newList,
        pageNum: pageNum + 1,
        hasMore: result.length === pageSize,
        showEmpty: newList.length === 0
      });
    } catch (error) {
      console.error('搜索商品失败', error);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        isLoading: false
      });
    }
  },

  /**
   * 点击历史记录项
   */
  onHistoryItemTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      keyword
    });
    this.handleSearch();
  },

  /**
   * 点击热门搜索项
   */
  onHotKeywordTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      keyword
    });
    this.handleSearch();
  },

  /**
   * 点击商品项
   */
  onProductTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/detail/detail?id=${id}`
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    if (this.data.hasMore) {
      this.loadSearchResults(true);
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});
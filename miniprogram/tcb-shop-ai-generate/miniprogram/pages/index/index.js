// 导入服务
import {
  getSwiperList
} from '../../services/swiper';
import {
  getCategoryList
} from '../../services/category';
import {
  getProductList
} from '../../services/product';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    swiperList: [], // 轮播图数据
    categoryList: [], // 分类数据
    productList: [], // 商品数据
    pageSize: 10, // 每页商品数量
    pageNum: 1, // 当前页码
    isLoading: false, // 是否正在加载
    hasMore: true, // 是否有更多数据
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function () {
    this.loadAllData();
  },

  /**
   * 加载所有数据
   */
  async loadAllData() {
    wx.showLoading({
      title: '加载中',
    });

    try {
      // 并行加载轮播图和分类数据
      await Promise.all([this.loadSwiperData(), this.loadCategoryData()]);

      // 加载商品数据
      await this.loadProductData();
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 加载轮播图数据
   */
  async loadSwiperData() {
    try {
      const result = await getSwiperList();
      // 按照sort字段排序
      const sortedList = result.sort((a, b) => a.sort - b.sort);
      this.setData({
        swiperList: sortedList.concat([{
          imageUrl: 'https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg'
        }]),
      });
    } catch (error) {
      console.error('加载轮播图失败:', error);
      throw error;
    }
  },

  /**
   * 加载分类数据
   */
  async loadCategoryData() {
    try {
      const result = await getCategoryList();
      // 按照sort字段排序
      const sortedList = result.sort((a, b) => a.sort - b.sort);
      // 只显示前8个分类
      const limitedList = sortedList.slice(0, 8);
      this.setData({
        categoryList: limitedList,
      });
    } catch (error) {
      console.error('加载分类失败:', error);
      throw error;
    }
  },

  /**
   * 加载商品数据
   */
  async loadProductData(isRefresh = false) {
    if (this.data.isLoading || (!isRefresh && !this.data.hasMore)) {
      return;
    }

    this.setData({
      isLoading: true,
    });

    try {
      // 如果是刷新，重置页码
      const pageNum = isRefresh ? 1 : this.data.pageNum;
      console.log({
        pageNum
      });

      const result = await getProductList({
        pageNum,
        pageSize: this.data.pageSize,
      });

      // 更新商品列表
      const newList = isRefresh ? result : [...this.data.productList, ...result];

      this.setData({
        productList: newList,
        pageNum: pageNum + 1,
        hasMore: result.length === this.data.pageSize,
      });
    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: '加载商品失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        isLoading: false,
      });

      // 如果是下拉刷新，停止下拉刷新动画
      if (isRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadAllData();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    this.loadProductData();
  },

  /**
   * 点击轮播图事件
   */
  onSwiperTap(e) {
    const item = e.currentTarget.dataset.item;
    if (item.jumpPath) {
      wx.navigateTo({
        url: item.jumpPath,
      });
    }
  },

  /**
   * 点击分类事件
   */
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/category/category?id=${category._id}&name=${category.name}`,
    });
  },

  /**
   * 点击商品事件
   */
  onProductTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/detail/detail?id=${id}`,
    });
  },

  /**
   * 跳转到搜索页
   */
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },
});
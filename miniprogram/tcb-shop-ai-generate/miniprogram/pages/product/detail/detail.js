// pages/product/detail/detail.js
import { getProductDetail } from '../../../services/product';
import { addToCart } from '../../../services/cart';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    productId: '', // 商品ID
    product: null, // 商品详情
    loading: true, // 加载状态
    buyCount: 1, // 购买数量
    activeTab: 0, // 当前激活的标签页
    addingToCart: false, // 添加到购物车状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取商品ID
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      productId: id
    });

    // 加载商品详情
    this.loadProductDetail();
  },

  /**
   * 加载商品详情
   */
  async loadProductDetail() {
    try {
      this.setData({ loading: true });
      const product = await getProductDetail(this.data.productId);
      
      if (!product) {
        wx.showToast({
          title: '商品不存在',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      this.setData({
        product,
        loading: false
      });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: product.name || '商品详情'
      });
    } catch (error) {
      console.error('加载商品详情失败', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'error'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 更新购买数量
   */
  onCountChange(event) {
    this.setData({
      buyCount: event.detail
    });
  },

  /**
   * 切换标签页
   */
  onTabChange(event) {
    this.setData({
      activeTab: event.detail.index
    });
  },

  /**
   * 添加到购物车
   */
  async onAddToCart() {
    const { product, buyCount } = this.data;
    if (!product) return;
    
    try {
      this.setData({ addingToCart: true });
      await addToCart(product, buyCount);
      wx.showToast({
        title: '已加入购物车',
        icon: 'success'
      });
    } catch (error) {
      console.error('添加到购物车失败', error);
      wx.showToast({
        title: '添加失败',
        icon: 'error'
      });
    } finally {
      this.setData({ addingToCart: false });
    }
  },

  /**
   * 立即购买
   */
  onBuyNow() {
    // 这里可以实现立即购买的逻辑
    wx.showToast({
      title: '购买功能开发中',
      icon: 'none'
    });
  },

  /**
   * 返回首页
   */
  onGoHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 分享商品
   */
  onShareAppMessage: function () {
    const { product } = this.data;
    return {
      title: product ? product.name : '好物分享',
      path: `/pages/product/detail/detail?id=${this.data.productId}`,
      imageUrl: product ? product.coverUrl : ''
    };
  }
})
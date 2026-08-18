// pages/cart/cart.js
import * as cartService from '../../services/cart';

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		cartItems: [], // 购物车商品列表
		selectAll: false, // 是否全选
		totalPrice: '0.00', // 总价
		selectedCount: 0, // 选中的商品数量
		isLoading: true, // 加载状态
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		this.loadCartItems();
	},

	/**
	 * 下拉刷新
	 */
	onPullDownRefresh: function () {
		this.loadCartItems()
			.then(() => {
				wx.stopPullDownRefresh();
			})
			.catch(() => {
				wx.stopPullDownRefresh();
			});
	},

	/**
	 * 加载购物车商品
	 */
	loadCartItems: async function () {
		try {
			this.setData({ isLoading: true });

			// 从云数据库获取购物车列表
			const cartItems = await cartService.getCartList();

			// 计算是否全选
			const selectAll = cartItems.length > 0 && cartItems.every((item) => item.selected);

			this.setData({
				cartItems,
				selectAll,
				isLoading: false,
			});

			this.calculateTotal();
		} catch (error) {
			console.error('加载购物车失败', error);
			wx.showToast({
				title: '加载购物车失败',
				icon: 'none',
			});
			this.setData({ isLoading: false });
		}
	},

	/**
	 * 选择/取消选择单个商品
	 */
	toggleSelect: async function (e) {
		try {
			const { id } = e.currentTarget.dataset;
			const { cartItems } = this.data;
			const index = cartItems.findIndex((item) => item._id === id);

			if (index > -1) {
				const newSelected = !cartItems[index].selected;

				// 更新云数据库中的选中状态
				await cartService.updateCartItemSelected(id, newSelected);

				// 更新本地数据
				cartItems[index].selected = newSelected;
				const selectAll = cartItems.length > 0 && cartItems.every((item) => item.selected);

				this.setData({
					cartItems,
					selectAll,
				});

				this.calculateTotal();
			}
		} catch (error) {
			console.error('更新选中状态失败', error);
			wx.showToast({
				title: '操作失败，请重试',
				icon: 'none',
			});
		}
	},

	/**
	 * 全选/取消全选
	 */
	toggleSelectAll: function () {
		const { selectAll, cartItems } = this.data;
		const newSelectAll = !selectAll;

		// 更新所有商品的选中状态
		const promises = cartItems.map((item) => cartService.updateCartItemSelected(item._id, newSelectAll));

		Promise.all(promises)
			.then(() => {
				// 更新本地数据
				const newCartItems = cartItems.map((item) => ({
					...item,
					selected: newSelectAll,
				}));

				this.setData({
					selectAll: newSelectAll,
					cartItems: newCartItems,
				});

				this.calculateTotal();
			})
			.catch((error) => {
				console.error('全选/取消全选失败', error);
				wx.showToast({
					title: '操作失败，请重试',
					icon: 'none',
				});
			});
	},

	/**
	 * 增加商品数量
	 */
	increaseCount: async function (e) {
		try {
			const { id } = e.currentTarget.dataset;
			const { cartItems } = this.data;
			const index = cartItems.findIndex((item) => item._id === id);

			if (index > -1) {
				const newCount = cartItems[index].count + 1;

				// 更新云数据库中的商品数量
				cartService.updateCartItemCount(id, newCount);

				// 更新本地数据
				cartItems[index].count = newCount;
				this.setData({ cartItems });
				this.calculateTotal();
			}
		} catch (error) {
			console.error('增加商品数量失败', error);
			wx.showToast({
				title: '操作失败，请重试',
				icon: 'none',
			});
		}
	},

	/**
	 * 减少商品数量
	 */
	decreaseCount: async function (e) {
		try {
			const { id } = e.currentTarget.dataset;
			const { cartItems } = this.data;
			const index = cartItems.findIndex((item) => item._id === id);

			if (index > -1 && cartItems[index].count > 1) {
				const newCount = cartItems[index].count - 1;

				// 更新云数据库中的商品数量
				await cartService.updateCartItemCount(id, newCount);

				// 更新本地数据
				cartItems[index].count = newCount;
				this.setData({ cartItems });
				this.calculateTotal();
			}
		} catch (error) {
			console.error('减少商品数量失败', error);
			wx.showToast({
				title: '操作失败，请重试',
				icon: 'none',
			});
		}
	},

	/**
	 * 删除商品
	 */
	deleteItem: function (e) {
		const { id } = e.currentTarget.dataset;
		const self = this;

		wx.showModal({
			title: '提示',
			content: '确定要删除这个商品吗？',
			success: function (res) {
				if (res.confirm) {
					// 从云数据库中删除商品
					cartService
						.removeFromCart(id)
						.then(() => {
							// 更新本地数据
							const { cartItems } = self.data;
							const newCartItems = cartItems.filter((item) => item._id !== id);
							const selectAll = newCartItems.length > 0 && newCartItems.every((item) => item.selected);

							self.setData({
								cartItems: newCartItems,
								selectAll,
							});

							self.calculateTotal();

							wx.showToast({
								title: '删除成功',
								icon: 'success',
							});
						})
						.catch((error) => {
							console.error('删除商品失败', error);
							wx.showToast({
								title: '删除失败，请重试',
								icon: 'none',
							});
						});
				}
			},
		});
	},

	/**
	 * 计算总价和选中数量
	 */
	calculateTotal: function () {
		const { cartItems } = this.data;
		let total = 0;
		let count = 0;

		cartItems.forEach((item) => {
			if (item.selected) {
				total += item.price * item.count;
				count += 1;
			}
		});

		this.setData({
			totalPrice: total.toFixed(2),
			selectedCount: count,
		});
	},

	/**
	 * 结算
	 */
	checkout: function () {
		const { cartItems } = this.data;
		const selectedItems = cartItems.filter((item) => item.selected);

		if (selectedItems.length === 0) {
			wx.showToast({
				title: '请选择要结算的商品',
				icon: 'none',
			});
			return;
		}

		// 将选中的商品信息存储到本地，供结算页面使用
		wx.setStorageSync('checkoutItems', selectedItems);

		// 跳转到结算页面
		wx.navigateTo({
			url: '/pages/checkout/checkout',
		});
	},
});

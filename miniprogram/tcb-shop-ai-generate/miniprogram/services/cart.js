/**
 * 购物车服务
 */

const db = wx.cloud.database();
const cartCollection = db.collection('cart');
const _ = db.command;

/**
 * 添加商品到购物车
 * @param {Object} product - 商品信息
 * @param {Number} count - 商品数量
 * @returns {Promise} - 添加结果
 */
export const addToCart = async (product, count = 1) => {
  try {
    // 获取当前用户的openid
    const { result } = await wx.cloud.callFunction({
      name: 'getOpenId'
    });
    const openid = result.openid;
    
    // 查询购物车中是否已存在该商品
    const res = await cartCollection.where({
      _openid: openid,
      productId: product._id
    }).get();
    
    if (res.data.length > 0) {
      // 商品已存在，更新数量
      const cartItem = res.data[0];
      return await cartCollection.doc(cartItem._id).update({
        data: {
          count: _.inc(count)
        }
      });
    } else {
      // 商品不存在，添加新记录
      return await cartCollection.add({
        data: {
          productId: product._id,
          name: product.name,
          price: product.price,
          coverUrl: product.coverUrl,
          count: count,
          selected: true,
          createTime: db.serverDate()
        }
      });
    }
  } catch (error) {
    console.error('添加到购物车失败', error);
    throw error;
  }
}

/**
 * 获取购物车列表
 * @returns {Promise} - 购物车列表
 */
export const getCartList = async () => {
  try {
    const { result } = await wx.cloud.callFunction({
      name: 'getOpenId'
    });
    const openid = result.openid;
    
    const res = await cartCollection.where({
      _openid: openid
    }).orderBy('createTime', 'desc').get();
      
    return res.data;
  } catch (error) {
    console.error('获取购物车列表失败', error);
    throw error;
  }
}

/**
 * 更新购物车商品数量
 * @param {String} id - 购物车项ID
 * @param {Number} count - 新的数量
 * @returns {Promise} - 更新结果
 */
export const updateCartItemCount = async (id, count) => {
  try {
    return await cartCollection.doc(id).update({
      data: {
        count: count
      }
    });
  } catch (error) {
    console.error('更新购物车商品数量失败', error);
    throw error;
  }
}

/**
 * 删除购物车商品
 * @param {String} id - 购物车项ID
 * @returns {Promise} - 删除结果
 */
export const removeFromCart = async (id) => {
  try {
    return await cartCollection.doc(id).remove();
  } catch (error) {
    console.error('删除购物车商品失败', error);
    throw error;
  }
}

/**
 * 更新购物车商品选中状态
 * @param {String} id - 购物车项ID
 * @param {Boolean} selected - 选中状态
 * @returns {Promise} - 更新结果
 */
export const updateCartItemSelected = async (id, selected) => {
  try {
    return await cartCollection.doc(id).update({
      data: {
        selected: selected
      }
    });
  } catch (error) {
    console.error('更新购物车商品选中状态失败', error);
    throw error;
  }
}
/**
 * 商品数据服务
 */

// 获取商品列表
export const getProductList = async (options = {}) => {
  try {
    const { 
      pageNum = 1, 
      pageSize = 10, 
      category = null,
      orderBy = { field: 'sales', direction: 'desc' } 
    } = options
    
    const db = wx.cloud.database()
    const query = db.collection('products')
    
    // 如果有分类筛选
    if (category) {
      query.where({
        categories: db.command.all([category])
      })
    }
    
    // 排序和分页
    const { data } = await query
      .orderBy(orderBy.field, orderBy.direction)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .get()
      
    return data
  } catch (error) {
    console.error('获取商品列表失败', error)
    return []
  }
}

// 获取商品详情
export const getProductDetail = async (id) => {
  try {
    const db = wx.cloud.database()
    const { data } = await db.collection('products')
      .doc(id)
      .get()
    return data
  } catch (error) {
    console.error('获取商品详情失败', error)
    return null
  }
}

// 获取热门商品
export const getHotProducts = async (limit = 6) => {
  try {
    const db = wx.cloud.database()
    const { data } = await db.collection('products')
      .orderBy('sales', 'desc')
      .limit(limit)
      .get()
    return data
  } catch (error) {
    console.error('获取热门商品失败', error)
    return []
  }
}

// 获取新品
export const getNewProducts = async (limit = 6) => {
  try {
    const db = wx.cloud.database()
    const { data } = await db.collection('products')
      .orderBy('createTime', 'desc') // 假设有createTime字段
      .limit(limit)
      .get()
    return data
  } catch (error) {
    console.error('获取新品失败', error)
    return []
  }
}

// 搜索商品
export const searchProducts = async (keyword, options = {}) => {
  try {
    const { 
      page = 1, 
      pageSize = 10
    } = options
    
    const db = wx.cloud.database()
    const _ = db.command
    
    const { data } = await db.collection('products')
      .where(_.or([
        {
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        },
        {
          description: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        }
      ]))
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
      
    return data
  } catch (error) {
    console.error('搜索商品失败', error)
    return []
  }
}
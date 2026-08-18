/**
 * 轮播图数据服务
 */

// 获取轮播图列表
export const getSwiperList = async () => {
  try {
    const db = wx.cloud.database()
    const { data } = await db.collection('swiper')
      .orderBy('sort', 'asc')
      .get()
    return data
  } catch (error) {
    console.error('获取轮播图数据失败', error)
    return []
  }
}
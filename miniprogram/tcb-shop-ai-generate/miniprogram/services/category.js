/**
 * 商品分类数据服务
 */

// 获取分类列表
export const getCategoryList = async () => {
	try {
		const db = wx.cloud.database();
		const { data } = await db.collection('categories').orderBy('sort', 'asc').get();
		return data;
	} catch (error) {
		console.error('获取分类列表数据失败', error);
		return [];
	}
};

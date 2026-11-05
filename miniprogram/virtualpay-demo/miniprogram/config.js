// 前端公共配置
module.exports = {
  // 云开发环境 ID（云开发控制台 → 设置 → 环境 ID）
  // 留空则使用默认环境
  envId: 'lowcode-0gwpl9v4125156ef',

  // 商品列表：productId 与价格（分）必须与 MP 后台【虚拟支付 → 道具管理】完全一致
  goods: [
    { productId: 'goods_001', name: '高级会员月卡', price: 100, desc: '订阅型：解锁全部高级功能 30 天' },
    { productId: 'goods_002', name: '加速卡10张', price: 200, desc: '功能型：任务加速次数 +10' },
    { productId: 'goods_003', name: '尊贵标识永久', price: 300, desc: '装饰型：专属头像框与个性标识' }
  ]
}

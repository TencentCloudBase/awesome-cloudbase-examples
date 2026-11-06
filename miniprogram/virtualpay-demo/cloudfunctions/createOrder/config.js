// createOrder 云函数配置
// ⚠️ 包含敏感信息，勿提交到公开仓库；正式环境建议改用云函数环境变量
module.exports = {
  // 小程序 AppID（MP 后台 → 设置）
  appid: 'wxbb99c114ac2eb81e',
  // 小程序 AppSecret（MP 后台 → 开发管理 → 开发设置，登录后可见）
  appSecret: 'YOUR_APP_SECRET',
  // 虚拟支付商户号（虚拟支付 → 基本配置）
  offerId: '1450634271',

  // 环境开关：true = 沙箱测试，false = 现网
  // 沙箱用沙箱 AppKey + env=1；现网用现网 AppKey + env=0
  sandbox: false,
  // 现网 AppKey（虚拟支付 → 基本配置）
  prodAppKey: 'YOUR_PROD_APP_KEY',
  // 沙箱 AppKey（虚拟支付 → 沙箱配置 / 测试环境）
  sandboxAppKey: 'YOUR_SANDBOX_APP_KEY',

  // 商品列表：productId 与价格（分）必须与前端 config.js、MP 后台道具管理一致
  goods: [
    { productId: 'goods_001', name: '高级会员月卡', price: 100 },
    { productId: 'goods_002', name: '加速卡10张', price: 200 },
    { productId: 'goods_003', name: '尊贵标识永久', price: 300 }
  ]
}

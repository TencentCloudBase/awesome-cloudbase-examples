// refundOrder 云函数配置（虚拟支付退款）
module.exports = {
  // 小程序 AppID（MP 后台 → 设置）
  appid: 'wxbb99c114ac2eb81e',
  // 小程序 AppSecret（MP 后台 → 开发管理 → 开发设置）
  appSecret: 'YOUR_APP_SECRET',
  // 虚拟支付商户号（虚拟支付 → 基本配置）
  offerId: '1450634271',

  // 环境开关：true = 沙箱测试，false = 现网
  sandbox: false,
  // 现网 AppKey（虚拟支付 → 基本配置）
  prodAppKey: 'YOUR_PROD_APP_KEY',
  // 沙箱 AppKey（虚拟支付 → 沙箱配置 / 测试环境）
  sandboxAppKey: 'YOUR_SANDBOX_APP_KEY'
}
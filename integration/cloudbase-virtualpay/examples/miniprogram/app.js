// app.js
App({
  globalData: {
    // ⚠️ 改成你自己的云开发环境 ID（云开发控制台 → 环境 → 环境ID）
    envId: 'YOUR_ENV_ID',
    // ⚠️ 必须与集成中心绑定的函数名逐字一致（形如 <集成名>-<后缀>）
    //    填错不会报"函数不存在"，而是调到一个同名空壳 → 运行时报「缺少 appId / secret」
    //    用 tcb fn list 确认哪个函数真的带着环境变量
    functionName: 'xpay-common',
  },

  onLaunch() {
    const { envId, functionName } = this.globalData;

    // 无条件打印：用于确认小程序运行时到底连的是哪个环境（改了 globalData 却没生效时，
    // 这里的输出仍会是旧值 —— 说明 App 实例复用了旧代码，需要清缓存后重新编译）
    console.log('[cloud env] envId =', envId);
    console.log('[cloud env] functionName =', functionName);

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: envId,
      traceUser: true,
    });

    console.log('[cloud env] wx.cloud.init 已执行');
  },
});

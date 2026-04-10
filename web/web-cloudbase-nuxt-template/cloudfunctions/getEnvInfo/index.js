const cloudbase = require('@cloudbase/node-sdk');

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 初始化 cloudbase 实例
    // env	string	否	TCB 环境 ID。如果 SDK 运行在 TCB云函数 环境下，默认使用函数所在环境的环境ID，运行在其他环境缺省该参数则会使用默认境
    const app = cloudbase.init({});
    // 获取环境ID
    const envId = tcb.SYMBOL_CURRENT_ENV
    // 可扩展更多环境信息
    return {
      success: true,
      envId: envId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 
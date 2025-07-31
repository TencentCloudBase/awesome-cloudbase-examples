const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
});

const db = app.database();

exports.main = async (event, context) => {
  console.log('云函数被调用，参数:', event);
  
  const { name = 'World', timestamp } = event;
  
  try {
    // 可以在这里进行数据库操作或其他业务逻辑
    return {
      success: true,
      message: `Hello ${name}!`,
      timestamp: timestamp || Date.now(),
      requestId: context.requestId,
      data: {
        platform: 'CloudBase',
        version: '1.0.0',
        env: context.environment,
        runtime: 'Node.js'
      }
    };
  } catch (error) {
    console.error('云函数执行错误:', error);
    return {
      success: false,
      error: error.message,
      requestId: context.requestId
    };
  }
}; 
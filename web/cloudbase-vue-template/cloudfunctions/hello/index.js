const cloud = require('@cloudbase/node-sdk')

// 初始化云开发实例
const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

// 获取数据库引用
const db = app.database()

/**
 * hello 云函数入口函数
 * @param {Object} event - 云函数的参数
 * @param {Object} context - 云函数的上下文信息
 */
exports.main = async (event, context) => {
  try {
    const { name = 'Vue' } = event

    // 记录函数调用日志
    console.log('hello 云函数被调用，参数：', event)

    // 返回问候消息
    return {
      code: 0,
      message: 'success',
      data: {
        greeting: `Hello, ${name}! 欢迎使用 CloudBase Vue 模板`,
        timestamp: new Date().toISOString(),
        env: process.env.TCB_ENV || 'unknown'
      }
    }
  } catch (error) {
    console.error('hello 云函数执行出错：', error)
    return {
      code: -1,
      message: error.message,
      data: null
    }
  }
} 
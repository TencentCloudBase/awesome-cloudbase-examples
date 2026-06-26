const cloudbase = require('@cloudbase/node-sdk');

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 初始化 cloudbase 实例
    const app = cloudbase.init({});
    const db = app.database();
    
    // 创建或获取todos集合
    const todosCollection = 'todos';
    
    // 尝试在集合中添加一条数据，如果集合不存在会自动创建
    const result = await db.collection(todosCollection).add({
      title: '欢迎使用CloudBase React模板',
      content: '这是一个初始化的待办事项',
      completed: false,
      createdAt: new Date()
    });
    
    // 创建索引（node-sdk 需通过集合对象创建索引）
    await db.collection(todosCollection).createIndex({
      name: 'idx_completed',
      key: { completed: 1 },
      unique: false
    });
    
    return {
      success: true,
      message: '数据库集合创建成功',
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
} 
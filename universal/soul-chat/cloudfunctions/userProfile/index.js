const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, uid, authUserInfo } = event
  
  console.log('userProfile云函数调用:', { action, uid, authUserInfo })
  
  try {
    switch (action) {
      case 'get':
        return await getUserProfile(uid)
      case 'create':
        return await createUserProfile(uid, authUserInfo)
      default:
        return {
          code: -1,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('userProfile 云函数错误:', error)
    return {
      code: -1,
      message: error.message || '服务器内部错误'
    }
  }
}

// 获取用户信息
async function getUserProfile(uid) {
  if (!uid) {
    return {
      code: -1,
      message: '用户ID不能为空'
    }
  }
  
  try {
    console.log('查询用户信息, uid:', uid)
    
    const result = await db.collection('users').where({
      uid: uid
    }).get()
    
    console.log('数据库查询结果:', result)
    
    if (result.data && result.data.length > 0) {
      return {
        code: 0,
        message: '获取成功',
        data: result.data[0]
      }
    } else {
      return {
        code: 1,
        message: '用户不存在',
        data: null
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      code: -1,
      message: '获取用户信息失败: ' + error.message
    }
  }
}

// 创建用户信息
async function createUserProfile(uid, authUserInfo) {
  if (!uid) {
    return {
      code: -1,
      message: '用户ID不能为空'
    }
  }
  
  try {
    console.log('创建用户信息, uid:', uid, 'authUserInfo:', authUserInfo)
    
    // 生成随机昵称
    const randomNicknames = [
      '神秘旅人', '夜空守望者', '晨曦使者', '星海漫游者', '风中的诗',
      '时光旅者', '梦境探索者', '银河系漫步', '彩虹收集者', '云端舞者',
      '月光精灵', '星辰探险家', '温柔的风', '海洋之心', '森林漫步者',
      '极光追寻者', '彩虹桥守护', '诗意栖居者', '静夜思者', '晨光收割者'
    ]
    
    const nickname = randomNicknames[Math.floor(Math.random() * randomNicknames.length)]
    
    const newUser = {
      uid: uid,
      nickname: nickname,
      avatar: authUserInfo?.avatar || '',
      phone: authUserInfo?.phone || '',
      customUserId: authUserInfo?.customUserId || '',
      loginType: authUserInfo?.loginType || 'phone',
      createTime: new Date(),
      updateTime: new Date(),
      status: 'online',
      lastActive: new Date()
    }
    
    console.log('准备插入用户数据:', newUser)
    
    const result = await db.collection('users').add(newUser)
    
    console.log('用户创建成功:', result)
    
    return {
      code: 0,
      message: '创建成功',
      data: {
        ...newUser,
        _id: result._id
      }
    }
  } catch (error) {
    console.error('创建用户信息失败:', error)
    return {
      code: -1,
      message: '创建用户信息失败: ' + error.message
    }
  }
} 
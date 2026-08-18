import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID - 请替换为您的实际环境ID
const envId = 'your-env-id';

// 初始化云开发
const app = cloudbase.init({
  env: envId
});

// 获取认证对象
const auth = app.auth();

// 获取数据库对象
const db = app.database();

// 获取房间集合
const roomsCollection = db.collection('game_rooms');

// 匿名登录
export async function login() {
  try {
    const loginState = await auth.getLoginState();
    if (!loginState) {
      await auth.signInAnonymously();
      const loginScope = await auth.loginScope();
      console.log('匿名登录状态:', loginScope === 'anonymous');
    }
    return auth.getLoginState();
  } catch (error) {
    console.error('获取登录状态或登录失败:', error);
    // 尝试重新匿名登录
    await auth.signInAnonymously();
    const loginScope = await auth.loginScope();
    console.log('匿名登录状态:', loginScope === 'anonymous');
    return auth.getLoginState();
  }
}

// 创建房间
export async function createRoom(roomData) {
  await login();
  return roomsCollection.add(roomData);
}

// 获取房间信息
export async function getRoomById(roomId) {
  await login();
  return roomsCollection.doc(roomId).get();
}

// 更新房间信息
export async function updateRoom(roomId, updateData) {
  await login();
  return roomsCollection.doc(roomId).update(updateData);
}

// 监听房间变化
export function watchRoom(roomId, callback) {
  if (!roomId || !callback) {
    console.warn('监听房间参数无效:', { roomId });
    return createEmptyWatcher();
  }

  return login().then(() => {
    console.log('开始监听房间变化:', roomId);
    try {
      // 使用where查询替代doc直接查询，可以规避一些权限问题
      const watcher = roomsCollection.where({
        _id: roomId
      }).watch({
        onChange: snapshot => {
          console.log('房间数据变化:', snapshot);
          if (snapshot.docs && snapshot.docs.length > 0) {
            callback(snapshot.docs[0]);
          } else {
            console.warn('房间数据为空或已被删除');
            callback(null);
          }
        },
        onError: err => {
          console.error('监听房间失败:', err);
          callback(null);
        }
      });

      // 确保返回的对象具有 close 方法
      return {
        close: () => {
          try {
            if (watcher && typeof watcher.close === 'function') {
              watcher.close();
            }
          } catch (error) {
            console.error('关闭房间监听失败:', error);
          }
        }
      };
    } catch (error) {
      console.error('设置监听时出错:', error);
      return createEmptyWatcher();
    }
  }).catch(err => {
    console.error('登录失败或设置监听时出错:', err);
    return createEmptyWatcher();
  });
}

// 创建一个空的监听器对象
function createEmptyWatcher() {
  return {
    close: () => {
      console.log('关闭空监听器');
    }
  };
}

// 验证房间密码
export async function verifyRoomPassword(roomId, password) {
  await login();
  const { data } = await roomsCollection.where({
    _id: roomId,
    password: password
  }).get();
  
  return data.length > 0;
}

// 调用云函数
export async function callFunction(name, data) {
  await login();
  return app.callFunction({
    name,
    data
  });
}

export { app, auth, db, roomsCollection }; 
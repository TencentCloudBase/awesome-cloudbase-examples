const tcb = require('@cloudbase/node-sdk')

exports.main = async (event, context) => {
  console.log('context:', context)
  console.log('event:', event)

  const tcbapp = tcb.init({
    // 这里 proxy 配置为本地代理层服务 Whistle
    // Whistle 可以将请求转发到本地运行的云函数
    // 如未配置 proxy 请求将默认直接调用到云端服务
    proxy: 'http://127.0.0.1:8899',
    context: {
      extendedContext: {
        tmpSecret: {
          secretId: 'this-is-a-fak-secretId',
          secretKey: 'this-is-a-fake-secretKey',
        }
      },
      ...context,
    }
  })

  const result = await tcbapp.callFunction({
    name: event.otherFuncName,

    // 函数型云托管 参数
    type: 'cloudrun',
    method: 'POST',
    path: '/abc',
    data: {
      key1: 'test value 1',
      key2: 'test value 2'
    }
  }, {
    timeout: 5000
  })

  return { result }
}

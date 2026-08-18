
exports.main = async function main (event, context) {
  // 切换到 SSE 模式
  const sse = context.sse()
  console.log(sse, 'sse')

  sse.on('close', () => {
    console.log('sse closed')
  })

  // 定时发送消息
  let i = 0
  const timer = setInterval(() => {
    if (!sse.closed) {
      console.log('hasSent-a:', i, sse.send({ id: i++, event: 'server-datetime-a', data: new Date().toISOString() }))
    } else {
      // 如果连接已经关闭，则清除定时器
      clearInterval(timer)
    }
  }, 1000)

  // 等待 定时发送消息 结束
  await new Promise ((resolve) => {
    // 定时发送事件到客户端
    let i = 0
    const timer = setInterval(() => {
      i++
      if (!sse.closed) {
        console.log('hasSent-b:', i, sse.send({ id: i, event: 'server-datetime-b', data: new Date().toISOString() }))
      } else {
        // 如果连接已经关闭，则清除定时器
        clearInterval(timer)
        resolve()
      }
      if (i >= 3) {
        sse.end({ data: 'this is end message, \nbye.' })
        clearInterval(timer)
        resolve()
      }
    }, 3000)
  })

  console.log('function end...')

  return ''
}


exports.main = async function main (event, context) {
  // 切换到 SSE 模式
  // Switch to SSE (Server-Sent Events) mode
  const sse = context.sse()
  console.log(sse, 'sse')

  // 监听客户端连接关闭事件
  // Listen for the client-side connection close event
  sse.on('close', () => {
    console.log('sse closed')
  })

  // 定时发送消息
  // Periodically send messages to the client (every 1s)
  let i = 0
  const timer = setInterval(() => {
    if (!sse.closed) {
      // 连接仍然开启，向客户端推送一条事件消息
      // Connection is still open, push an event message to the client
      console.log('hasSent-a:', i, sse.send({ id: i++, event: 'server-datetime-a', data: new Date().toISOString() }))
    } else {
      // 如果连接已经关闭，则清除定时器
      // If the connection has been closed, clear the timer to stop sending
      clearInterval(timer)
    }
  }, 1000)

  // 等待 定时发送消息 结束
  // Wait for the scheduled message-sending loop to finish before returning
  await new Promise ((resolve) => {
    // 定时发送事件到客户端
    // Periodically send events to the client (every 3s)
    let i = 0
    const timer = setInterval(() => {
      i++
      if (!sse.closed) {
        // 连接仍然开启，向客户端推送一条事件消息
        // Connection is still open, push an event message to the client
        console.log('hasSent-b:', i, sse.send({ id: i, event: 'server-datetime-b', data: new Date().toISOString() }))
      } else {
        // 如果连接已经关闭，则清除定时器
        // If the connection has been closed, clear the timer and resolve the promise
        clearInterval(timer)
        resolve()
      }
      if (i >= 3) {
        // 达到发送次数上限，发送结束消息并关闭 SSE 流
        // Reached the send count limit; send the end message and close the SSE stream
        sse.end({ data: 'this is end message, \nbye.' })
        clearInterval(timer)
        resolve()
      }
    }, 3000)
  })

  // 云函数执行结束
  // Cloud function execution finished
  console.log('function end...')

  return ''
}

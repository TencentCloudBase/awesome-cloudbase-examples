
exports.main = async function main (event, context) {
  // Switch to SSE mode
  const sse = context.sse()
  console.log(sse, 'sse')

  sse.on('close', () => {
    console.log('sse closed')
  })

  // Send messages periodically
  let i = 0
  const timer = setInterval(() => {
    if (!sse.closed) {
      console.log('hasSent-a:', i, sse.send({ id: i++, event: 'server-datetime-a', data: new Date().toISOString() }))
    } else {
      // If connection is closed, clear the timer
      clearInterval(timer)
    }
  }, 1000)

  // Wait for periodic message sending to end
  await new Promise ((resolve) => {
    // Send events to client periodically
    let i = 0
    const timer = setInterval(() => {
      i++
      if (!sse.closed) {
        console.log('hasSent-b:', i, sse.send({ id: i, event: 'server-datetime-b', data: new Date().toISOString() }))
      } else {
        // If connection is closed, clear the timer
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

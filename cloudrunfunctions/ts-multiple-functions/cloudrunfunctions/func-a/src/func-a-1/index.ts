import { TcbEventFunction } from '@cloudbase/functions-typings'

import { x } from './lib'

// GET no boyd
export const main: TcbEventFunction = function(event, context) {
  console.log('x', x)
  console.log('hello a-1')
  return 'a-1'
}
 
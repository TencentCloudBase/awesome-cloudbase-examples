import * as crypto from 'crypto'
import { customAlphabet } from 'nanoid'
import lodash from 'lodash'

export function genRandomStr (length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
}

export function safeJsonParse (jsonString: string, defaultValue = null) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.log('safeJsonParse error', error)
    return defaultValue
  }
}

/**
 * 生成随机 id，默认16位
 */
export function randomId (len = 16) {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', len)()
}

// 解析嵌套对象，提取指定key的value
export function extractWithLodash (obj: any, keys: string[], depth: number = 5): any {
  if (depth <= 0) {
    return {}
  }

  return lodash.reduce(
    obj,
    (result: any, value: any, key: string) => {
      // 处理直接匹配的键
      if (keys.includes(key) && !(lodash.isObject(value) || lodash.isArray(value))) {
        result[key] = result[key] || []
        result[key].push(value)
      }

      // 处理嵌套对象或数组
      processNestedValue(result, value, keys, depth)

      return result
    },
    {}
  )
}

// 处理嵌套对象或数组的递归逻辑
function processNestedValue (result: any, value: any, keys: string[], depth: number) {
  if (lodash.isObject(value) && !lodash.isArray(value)) {
    const nested = extractWithLodash(value, keys, depth - 1)
    lodash.forEach(nested, (values, nestedKey) => {
      result[nestedKey] = (result[nestedKey] || []).concat(values)
    })
  }

  if (lodash.isArray(value)) {
    value.forEach((item) => {
      if (lodash.isObject(item)) {
        const nested = extractWithLodash(item, keys, depth - 1)
        lodash.forEach(nested, (values, nestedKey) => {
          result[nestedKey] = (result[nestedKey] || []).concat(values)
        })
      }
    })
  }
}

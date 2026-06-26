/**
 * 日志工具
 * 统一日志格式，方便排查问题
 *
 * 使用方式：
 *   const logger = require('./_lib/logger');
 *   logger.info('模块名', '事件描述', { key: value });
 */

// 日志级别
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

// 当前日志级别（可通过环境变量 LOG_LEVEL 控制，默认 INFO）
const currentLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();

function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel];
}

/**
 * 格式化日志输出
 * @param {string} level   - 日志级别
 * @param {string} module  - 模块名称（如 'Controller', 'Service', 'SDK'）
 * @param {string} message - 日志消息
 * @param {Object} extra   - 额外数据（可选）
 */
function log(level, module, message, extra) {
    if (!shouldLog(level)) return;

    const ts = new Date().toISOString();
    const prefix = `[${ts}] [${level}] [${module}]`;

    if (extra !== undefined) {
        console.log(prefix, message, JSON.stringify(extra));
    } else {
        console.log(prefix, message);
    }
}

module.exports = {
    debug: (mod, msg, extra) => log('DEBUG', mod, msg, extra),
    info:  (mod, msg, extra) => log('INFO',  mod, msg, extra),
    warn:  (mod, msg, extra) => log('WARN',  mod, msg, extra),
    error: (mod, msg, extra) => log('ERROR', mod, msg, extra),
    LEVELS,
};

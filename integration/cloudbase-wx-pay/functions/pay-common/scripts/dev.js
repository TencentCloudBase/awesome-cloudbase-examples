#!/usr/bin/env node
/**
 * 本地联调启动器（跨平台）
 *
 * 为什么不用 `"dev": "PAY_GUARD=off node ./bin/www"`：
 *   那是 POSIX shell 语法，Windows 的 cmd / PowerShell 不认，会直接把
 *   `PAY_GUARD=off` 当成命令名报错。示例仓库两种系统都有人用，
 *   所以改成在进程内设环境变量 —— 零依赖、零副作用。
 *
 * 生产不要用这个入口：
 *   PAY_GUARD=off 会跳过 orderService 的 4 个业务钩子（金额 / 归属 / 转账），
 *   云上带 off 启动会被 app.js 直接拒绝。
 */
process.env.PAY_GUARD = 'off';

console.warn('[dev] PAY_GUARD=off（联调模式）：金额校验、订单归属、转账权限均跳过，仅限本地');

require('../bin/www');

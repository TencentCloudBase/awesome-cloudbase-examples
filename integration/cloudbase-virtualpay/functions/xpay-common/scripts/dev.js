#!/usr/bin/env node
/**
 * 本地联调启动器（跨平台）
 *
 * 为什么不用 `"dev": "XPAY_GUARD=off node ./bin/www"`：
 *   那是 POSIX shell 语法，Windows 的 cmd / PowerShell 不认，
 *   会把 `XPAY_GUARD=off` 当成命令名直接报错。示例仓库两种系统都有人用，
 *   所以改成在进程内设环境变量 —— 零依赖、零副作用。
 *
 * 生产不要用这个入口：
 *   XPAY_GUARD=off 会让「本地查不到订单」直接放行查单、放过退款，
 *   云上带 off 启动会被 app.js 直接拒绝。
 */
process.env.XPAY_GUARD = 'off';

console.warn('[dev] XPAY_GUARD=off（联调模式）：查单归属 / iOS 退款问询均放行，仅限本地');

require('../bin/www');

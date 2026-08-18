// HTTP 云函数入口文件（CLI 部署校验用）
// 实际运行走 scf_bootstrap 启动 Express 服务
const app = require('./app');

exports.main = app;

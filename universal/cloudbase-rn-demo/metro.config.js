const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 解决 cloudbase SDK 兼容性问题
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs'];

module.exports = config;

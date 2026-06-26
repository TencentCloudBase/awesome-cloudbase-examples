<?php

/**
 * Laravel 云函数入口文件
 * 按照腾讯云官方文档标准实现
 * 参考: https://cloud.tencent.com/document/product/583/59232
 */

// 云函数环境优化：禁用弃用警告
if (PHP_VERSION_ID >= 80400) {
    // PHP 8.4+ 中 E_STRICT 已被移除
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
} else {
    // PHP 8.4 以下版本
    error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_NOTICE);
}

// 检测是否为云函数环境
if (getenv('SERVERLESS') === '1') {
    // 云函数环境下，直接加载 Laravel 应用
    require_once __DIR__ . '/public/index.php';
} else {
    // 本地开发环境
    if (file_exists(__DIR__ . '/public/index.php')) {
        require_once __DIR__ . '/public/index.php';
    } else {
        echo "Laravel application not found. Please run 'composer install' first.";
        exit(1);
    }
}
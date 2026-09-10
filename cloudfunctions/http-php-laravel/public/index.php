<?php
// Laravel HTTP function entry point
// 简化版：直接返回 JSON，不加载完整 Laravel 框架
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'message'   => 'Hello World from Laravel HTTP Function!',
    'method'    => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    'path'      => $_SERVER['REQUEST_URI'] ?? '/',
    'timestamp' => gmdate('c'),
], JSON_UNESCAPED_UNICODE);

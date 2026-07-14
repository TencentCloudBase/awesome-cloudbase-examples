<?php
// 使用 PHP 内置 web server 的路由文件，将所有请求统一返回 JSON
// Router for the PHP built-in web server; responds with a JSON payload for every request

header('Content-Type: application/json; charset=utf-8');

$payload = [
    'message'   => 'Hello World from PHP HTTP Function!',
    'method'    => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    'path'      => $_SERVER['REQUEST_URI'] ?? '/',
    'timestamp' => gmdate('c'),
];

echo json_encode($payload, JSON_UNESCAPED_UNICODE);

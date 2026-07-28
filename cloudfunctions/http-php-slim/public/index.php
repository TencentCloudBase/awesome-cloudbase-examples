<?php
// Slim Framework HTTP function entry point
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'message'   => 'Hello World from Slim Framework HTTP Function!',
    'method'    => $_SERVER['REQUEST_METHOD'] ?? 'GET',
    'path'      => $_SERVER['REQUEST_URI'] ?? '/',
    'timestamp' => gmdate('c'),
], JSON_UNESCAPED_UNICODE);

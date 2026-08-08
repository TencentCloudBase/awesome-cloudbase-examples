<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'message' => 'Hello World from Laravel on CloudBase Run!',
    'timestamp' => gmdate('c'),
], JSON_UNESCAPED_UNICODE);

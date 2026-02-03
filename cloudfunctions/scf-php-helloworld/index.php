<?php
/**
 * 腾讯云 SCF PHP HelloWorld 示例
 * 
 * 入口函数：main_handler
 * 执行方法：index.main_handler
 */

/**
 * 主处理函数
 * 
 * @param object $event 触发事件数据
 * @param object $context 运行时上下文信息
 * @return string 返回消息
 */
function main_handler($event, $context) {
    // 打印事件信息
    echo "Event data:\n";
    print_r($event);
    
    // 打印上下文信息
    echo "\nContext data:\n";
    print_r($context);
    
    // 获取请求ID
    $requestId = isset($context->requestId) ? $context->requestId : 'unknown';
    
    // 构造返回消息
    $response = [
        'statusCode' => 200,
        'message' => 'Hello World from PHP SCF!',
        'requestId' => $requestId,
        'timestamp' => date('Y-m-d H:i:s'),
        'event' => $event
    ];
    
    return json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

/**
 * 简单的字符串处理函数
 * 
 * @param object $event 事件数据，期望包含 name 字段
 * @param object $context 上下文信息
 * @return string 个性化问候消息
 */
function hello_handler($event, $context) {
    $name = isset($event->name) ? $event->name : 'World';
    
    $response = [
        'message' => "Hello, {$name}!",
        'requestId' => isset($context->requestId) ? $context->requestId : 'unknown',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    return json_encode($response, JSON_UNESCAPED_UNICODE);
}

/**
 * 数学计算示例函数
 * 
 * @param object $event 事件数据，期望包含 a 和 b 字段
 * @param object $context 上下文信息
 * @return string 计算结果
 */
function calculate_handler($event, $context) {
    $a = isset($event->a) ? (float)$event->a : 0;
    $b = isset($event->b) ? (float)$event->b : 0;
    
    $result = [
        'input' => [
            'a' => $a,
            'b' => $b
        ],
        'operations' => [
            'sum' => $a + $b,
            'difference' => $a - $b,
            'product' => $a * $b,
            'quotient' => $b != 0 ? $a / $b : 'Cannot divide by zero'
        ],
        'requestId' => isset($context->requestId) ? $context->requestId : 'unknown',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    return json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

/**
 * 错误处理示例函数
 * 
 * @param object $event 事件数据
 * @param object $context 上下文信息
 * @return string 错误信息或成功消息
 */
function error_handler($event, $context) {
    try {
        // 模拟可能出错的操作
        if (isset($event->shouldError) && $event->shouldError === true) {
            throw new Exception("This is a simulated error for testing purposes");
        }
        
        $response = [
            'status' => 'success',
            'message' => 'No error occurred',
            'requestId' => isset($context->requestId) ? $context->requestId : 'unknown'
        ];
        
        return json_encode($response, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        $errorResponse = [
            'status' => 'error',
            'message' => $e->getMessage(),
            'requestId' => isset($context->requestId) ? $context->requestId : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        // 记录错误日志
        error_log("SCF Error: " . $e->getMessage());
        
        return json_encode($errorResponse, JSON_UNESCAPED_UNICODE);
    }
}
?>
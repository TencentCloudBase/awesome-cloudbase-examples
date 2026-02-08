<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

/*
|--------------------------------------------------------------------------
| 云函数环境优化
|--------------------------------------------------------------------------
|
| 在云函数环境中，我们需要确保所有响应都是JSON格式，包括错误响应
|
*/

// 检测云函数环境
$isServerless = getenv('SERVERLESS') === '1' || 
                getenv('SCF_RUNTIME_API') || 
                getenv('TENCENTCLOUD_RUNENV') === 'SCF' ||
                isset($_SERVER['SERVERLESS']) ||
                isset($_SERVER['SCF_RUNTIME_API']) ||
                isset($_SERVER['TENCENTCLOUD_RUNENV']);

if ($isServerless) {
    // 设置错误处理器，确保错误以JSON格式返回
    set_error_handler(function($severity, $message, $file, $line) {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => true,
            'message' => 'Server Error: ' . $message,
            'status' => 500,
            'file' => $file,
            'line' => $line
        ]);
        exit;
    });

    // 设置异常处理器
    set_exception_handler(function($exception) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => true,
            'message' => $exception->getMessage() ?: 'Server Error',
            'status' => 500,
            'exception' => get_class($exception),
            'file' => $exception->getFile(),
            'line' => $exception->getLine()
        ]);
        exit;
    });

    // 设置致命错误处理器
    register_shutdown_function(function() {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => true,
                'message' => 'Fatal Error: ' . $error['message'],
                'status' => 500,
                'file' => $error['file'],
                'line' => $error['line']
            ]);
            exit;
        }
    });
}

/*
|--------------------------------------------------------------------------
| Check If The Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is in maintenance / demo mode via the "down" command
| we will load this file so that any pre-rendered content can be shown
| instead of starting the framework, which could cause an exception.
|
*/

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| Composer provides a convenient, automatically generated class loader for
| this application. We just need to utilize it! We'll simply require it
| into the script here so we don't need to manually load our classes.
|
*/

require __DIR__.'/../vendor/autoload.php';

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request using
| the application's HTTP kernel. Then, we will send the response back
| to this client's browser, allowing them to enjoy our application.
|
*/

$app = require_once __DIR__.'/../bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
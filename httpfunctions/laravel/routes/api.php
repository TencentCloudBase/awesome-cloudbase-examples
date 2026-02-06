<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HelloWorldController;

/*
|--------------------------------------------------------------------------
| API Routes - Laravel HelloWorld 示例
|--------------------------------------------------------------------------
|
| 简洁的 API 路由配置
|
*/

// API版本的HelloWorld
Route::get('/hello', [HelloWorldController::class, 'index']);
Route::get('/hello/{name}', [HelloWorldController::class, 'greet']);

// 系统信息API
Route::get('/info', [HelloWorldController::class, 'info']);

// 简单的健康检查
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Laravel HelloWorld is running',
        'timestamp' => now()->toISOString()
    ]);
});
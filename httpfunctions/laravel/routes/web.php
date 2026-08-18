<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HelloWorldController;

/*
|--------------------------------------------------------------------------
| Web Routes - Laravel HelloWorld 示例
|--------------------------------------------------------------------------
|
| 简洁的 HelloWorld 路由配置，适用于云函数环境
|
*/

// HelloWorld 主页
Route::get('/', [HelloWorldController::class, 'index']);

// 个性化问候
Route::get('/hello/{name?}', [HelloWorldController::class, 'greet']);

// 系统信息
Route::get('/info', [HelloWorldController::class, 'info']);
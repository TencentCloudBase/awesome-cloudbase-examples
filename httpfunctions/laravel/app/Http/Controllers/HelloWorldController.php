<?php

namespace App\Http\Controllers;

class HelloWorldController extends Controller
{
    /**
     * 显示 Hello World 消息
     */
    public function index()
    {
        return response()->json([
            'message' => 'Hello World!',
            'framework' => 'Laravel',
            'version' => app()->version(),
            'php_version' => PHP_VERSION,
            'timestamp' => now()->toISOString(),
            'environment' => app()->environment()
        ]);
    }

    /**
     * 个性化问候
     */
    public function greet($name = 'World')
    {
        return response()->json([
            'message' => "Hello, {$name}!",
            'greeting' => '欢迎使用 Laravel 云函数',
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * 系统信息
     */
    public function info()
    {
        return response()->json([
            'application' => [
                'name' => 'Laravel HelloWorld',
                'framework' => 'Laravel',
                'version' => app()->version(),
                'environment' => app()->environment(),
                'timezone' => config('app.timezone'),
                'locale' => config('app.locale')
            ],
            'system' => [
                'php_version' => PHP_VERSION,
                'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
                'memory_peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB'
            ],
            'timestamp' => now()->toISOString()
        ]);
    }
}
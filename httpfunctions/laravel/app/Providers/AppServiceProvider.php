<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // 云函数环境优化：禁用弃用警告
        if (getenv('SERVERLESS') === '1') {
            error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_NOTICE);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 云函数环境强制JSON响应
        if ($this->isServerlessEnvironment()) {
            // 设置默认响应格式为JSON
            request()->headers->set('Accept', 'application/json');
            request()->headers->set('Content-Type', 'application/json');
        }
    }

    /**
     * 检测是否为云函数环境
     */
    private function isServerlessEnvironment(): bool
    {
        return getenv('SERVERLESS') === '1' || 
               getenv('SCF_RUNTIME_API') || 
               getenv('TENCENTCLOUD_RUNENV') === 'SCF' ||
               isset($_SERVER['SERVERLESS']) ||
               isset($_SERVER['SCF_RUNTIME_API']) ||
               isset($_SERVER['TENCENTCLOUD_RUNENV']);
    }
}
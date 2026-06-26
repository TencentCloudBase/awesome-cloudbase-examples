<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ForceJsonResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // 检测云函数环境
        if ($this->isServerlessEnvironment()) {
            // 强制设置请求头为JSON
            $request->headers->set('Accept', 'application/json');
            $request->headers->set('Content-Type', 'application/json');
        }

        return $next($request);
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
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $exception)
    {
        // 云函数环境或API请求始终返回JSON响应
        if ($this->shouldReturnJson($request, $exception)) {
            return $this->prepareJsonResponse($request, $exception);
        }

        return parent::render($request, $exception);
    }

    /**
     * Determine if the request warrants a JSON response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return bool
     */
    protected function shouldReturnJson($request, Throwable $exception)
    {
        // 云函数环境检测（多种方式）
        if (getenv('SERVERLESS') === '1' || 
            getenv('SCF_RUNTIME_API') || 
            getenv('TENCENTCLOUD_RUNENV') === 'SCF' ||
            isset($_SERVER['SERVERLESS']) ||
            isset($_SERVER['SCF_RUNTIME_API']) ||
            isset($_SERVER['TENCENTCLOUD_RUNENV'])) {
            return true;
        }

        // API请求返回JSON
        if ($request->expectsJson() || $request->is('api/*')) {
            return true;
        }

        // 检查Accept头部
        if ($request->wantsJson()) {
            return true;
        }

        // 默认情况下，如果没有明确的HTML请求，返回JSON
        $acceptHeader = $request->header('Accept', '');
        if (strpos($acceptHeader, 'text/html') === false) {
            return true;
        }

        return false;
    }

    /**
     * Prepare a JSON response for the given exception.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Throwable  $exception
     * @return \Illuminate\Http\JsonResponse
     */
    protected function prepareJsonResponse($request, Throwable $exception)
    {
        $status = $this->isHttpException($exception) 
            ? $exception->getStatusCode() 
            : 500;

        $response = [
            'error' => true,
            'message' => $exception->getMessage() ?: 'Server Error',
            'status' => $status
        ];

        // 开发环境显示详细错误信息
        if (config('app.debug')) {
            $response['exception'] = get_class($exception);
            $response['file'] = $exception->getFile();
            $response['line'] = $exception->getLine();
            $response['trace'] = collect($exception->getTrace())->map(function ($trace) {
                return Arr::except($trace, ['args']);
            })->all();
        }

        return response()->json($response, $status);
    }
}
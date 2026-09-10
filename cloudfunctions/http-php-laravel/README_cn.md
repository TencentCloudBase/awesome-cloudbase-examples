# http-php-laravel

使用 [Laravel](https://laravel.com/) 框架的 CloudBase HTTP 函数模板（骨架版本）。

由于 Laravel 完整项目体积较大（数千文件），本模板仅提供入口约定，**不预置完整骨架**。请按下面的方式初始化项目结构后再补充自定义路由和代码。

## 建议结构（`composer create-project` 之后）

```text
http-php-laravel/
├── scf_bootstrap       # 启动脚本，运行 php -S 0.0.0.0:9000 -t public public/index.php
├── composer.json       # 已提供
├── app/                # Laravel 应用代码（HTTP/控制器/服务）
├── bootstrap/
├── config/
├── public/
│   └── index.php       # Laravel 入口（由脚手架生成）
├── routes/
│   └── web.php / api.php
├── storage/
├── .env                # 环境变量（注意不要提交到仓库）
└── README_cn.md / README_en.md
```

## 初始化项目骨架

推荐使用官方脚手架在临时目录创建完整 Laravel 项目，再把生成的文件平移过来：

```bash
# 1. 用 Laravel 安装器/Composer 创建项目到临时目录
composer create-project laravel/laravel /tmp/laravel-app

# 2. 把生成的目录复制到当前模板（保留 scf_bootstrap、README）
rsync -a /tmp/laravel-app/ ./ --exclude README.md

# 3. 生成应用 key
php artisan key:generate

# 4. 安装依赖（如果上一步未自动安装）
composer install
```

## 本地运行

```bash
# Laravel 自带 dev server（推荐用于本地开发）
php artisan serve --host=0.0.0.0 --port=9000

# 或者使用 PHP 内置 web server（与 scf_bootstrap 行为一致）
php -S 0.0.0.0:9000 -t public public/index.php

# 然后访问 http://localhost:9000
```

## 添加示例路由

编辑 `routes/web.php`（或 `routes/api.php`）：

```php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message'   => 'Hello World from Laravel!',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::post('/echo', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'code'        => 200,
        'requestBody' => $request->all(),
    ]);
});
```

## 部署到 CloudBase HTTP 函数

1. 在本地执行 `composer install --no-dev --optimize-autoloader` 生成 `vendor/`。
2. 将含 `scf_bootstrap`、`composer.json`、`vendor/`、`public/`、`app/` 等完整目录上传。
3. 在 CloudBase 控制台新建「HTTP 触发函数」，运行环境选择 `PHP` 或 CustomRuntime。
4. 配置生产环境变量（`APP_KEY`、数据库等）；建议通过控制台环境变量注入，不要将 `.env` 与 `APP_KEY` 一起上传。


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（`type: http`、`runtime: CustomRuntime`、`path: /http-php-laravel`）。本函数依赖 `scf_bootstrap` 启动自定义运行时进程，由 CloudBase CLI 一键打包上传。
> 在部署前请执行 `composer install --no-dev --optimize-autoloader`，确保 `vendor/` 已存在。

This folder ships a ready-to-use `cloudbaserc.json` (`type: http`, `runtime: CustomRuntime`, `path: /http-php-laravel`). It relies on `scf_bootstrap` to launch the custom runtime; CloudBase CLI packages and uploads everything in one go.
> Before deploying, run `composer install --no-dev --optimize-autoloader` so that `vendor/` exists.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. (按需) 先准备构建产物 / Optionally build artifacts first
#    Go:   ./build.sh
#    Java: mvn clean package && cp target/app.jar ./app.jar
#    PHP:  composer install --no-dev --optimize-autoloader

# 3. 部署 / Deploy
tcb fn deploy -e <YOUR_ENV_ID>

# 4. 访问 / Invoke via HTTP
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-php-laravel/

# 5. 查看日志 / Tail logs
tcb fn log http-php-laravel -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

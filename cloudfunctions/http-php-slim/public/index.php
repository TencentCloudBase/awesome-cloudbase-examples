<?php
// Slim 应用入口 / Slim application entry
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addErrorMiddleware(true, true, true);

// 健康检查 / Health check
$app->get('/', function (Request $request, Response $response): Response {
    $payload = [
        'message'   => 'Hello World from Slim!',
        'method'    => $request->getMethod(),
        'path'      => (string) $request->getUri()->getPath(),
        'timestamp' => gmdate('c'),
    ];
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
});

// 示例 JSON 路由 / Sample JSON route
$app->get('/json', function (Request $request, Response $response): Response {
    $response->getBody()->write(json_encode([
        'code' => 200,
        'data' => ['a' => 123],
    ]));
    return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
});

// 回显请求体 / Echo route
$app->post('/echo', function (Request $request, Response $response): Response {
    $body = (array) $request->getParsedBody();
    $response->getBody()->write(json_encode([
        'code'        => 200,
        'requestBody' => $body,
    ], JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
});

$app->run();

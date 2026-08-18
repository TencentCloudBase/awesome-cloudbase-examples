# README

函数型云托管 集成消息队列（Kafka、Pulsar）和 Redis 实现与客户端收发消息/延时消息的示例。

## 架构示意图

![architecture](./architecture.jpg)

## 时序图

```mermaid
sequenceDiagram
    autonumber
    actor c as 客户端
    box rgb(33,66,99) 函数型云托管 集群
    participant t as 函数 trigger
    participant m as 函数 message
    end
    participant k as Kafka
    participant p as Pulsar
    participant r as Redis


    m --> k: 消费消息（异步）
    m --> p: 消费消息（异步）
    c ->> +m: 建立 Websocket 连接
    note over m: 订阅客户端 channel，异步完成
    m --> r: 订阅 Redis channel（异步）

    c ->> +t: HTTP 请求触发函数，执行操作
    t -->> -c: 返回（同步）
    t ->> k: 投递消息
    t ->> p: 投递延时消息

    note over k: Kafka 投递消息完成后，函数 message 进行消费
    note over p: Pulsar 投递延时消息完成后，函数 message 进行消费
    m --> r: 收到消息后，发布到客户端 channel（异步）
    m -->> c: 推送消息到指定客户端（异步）

```

## 目录结构说明

```sh
.
|-- cloudbase-functions.json    # 函数配置文件
|-- cloudrunfunctions           # 函数目录
|   |-- message                 # 函数 message
|   `-- trigger                 # 函数 trigger
|-- ecosystem.config.js         # pm2 配置文件
|-- package.json                # 项目配置文件
|-- packages                    # 项目共享代码目录
|   `-- common
|-- pnpm-workspace.yaml         # pnpm 工作空间配置文件
`-- tsconfig.json               # TypeScript 配置文件
```

## 使用

1. 前置条件

- 安装 `Node.js`
- 安装 `pnpm`
- 安装 `@cloudbase/functions-framework`

2. 进入项目根目录，安装依赖并构建

```sh
pnpm i

pnpm run build
```

3. 在项目根目录创建 `.env` 文件，填入中间件参数

```sh
touch .env
```

`.env` 文件内容：

```env
KAFKA_BROKER=ip:port        # Kafka 连接地址
KAFKA_TOPIC=your-topic       # Kafka 主题名
REDIS_URL=redis://ip:port   # Redis 连接地址
PULSAR_SERVICE_URL=http://xxx:8080 # Pulsar 连接地址
PULSAR_TOPIC=your-topic      # Pulsar 主题名
PULSAR_SUBSCRIPTION=xxx     # Pulsar 订阅名
PULSAR_TOKEN=eyJxxx         # Pulsar 认证 token
```

4. 启动服务

```sh
pnpm start
```

5. 客户端向 `message` 函数发起 websocket 长链接

```sh
# User-Agent、客户端 IP 用于关联客户端
wscat -c "ws://127.0.0.1:3000/message" -H "User-Agent:unique-client"
```

6. 客户端向 `trigger` 函数发送消息

```sh
# User-Agent、客户端 IP 用于关联客户端
curl -v http://127.0.0.1:3000/trigger \
    -H "content-type:application/json" \
    -H "User-Agent:unique-client" \
    -d '{"id":"Hello"}'
```
该命令执行后，会触发两条消息推送，其中一个是实时消息，另一个是延时（3s）消息。

7. 连接到 `message` 函数的客户端收到服务端推送的消息，消息内容为客户端向 `trigger` 函数发送的消息

```text
< {"id":"Hello"}
```

8. 使用 `pm2` 扩展为多节点部署

    8.1 全局安装 `pm2`

    ```sh
    npm i -g pm2
    ```

    8.2 使用 pm2 启动项目

    ```sh
    pm2 start ecosystem.config.js
    ```

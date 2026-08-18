# cloudrunfunctions 函数型云托管

该目录下包含两个函数：

* `func-a`：一个简单的单实例多函数示例。
* `func-b`：一个简单的函数示例。

每个函数对应一个 `函数型云托管` 服务，上传云函数时，需要上传对应函数的整个目录。

可根据需要，创建新的函数目录，或者删除现有的函数目录。

## 如何运行？

安装 `tcb-ff` 工具：

```sh
npm install -g @cloudbase/functions-framework
```

进入函数代码目录，`func-a` 或 `func-b` 或 其他，执行以下命令：

```sh
cd func-a 进入函数 a 代码目录
cd func-b 进入函数 b 代码目录
```

```sh
npx tsc && tcb-ff
```

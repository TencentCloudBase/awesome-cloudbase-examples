# 函数型云托管示例项目-TS函数项目

该示例代码演示如何通过 `TypeScript` 编写 `函数型云托管` 项目代码。包括项目结构示例，以及如何调试。

如何调试代码可参考：<https://docs.cloudbase.net/cbrf/how-to-debug-functions-code#%E8%B0%83%E8%AF%95-typescript-%E4%BB%A3%E7%A0%81>

JavaScript 示例代码见：<https://github.com/TencentCloudBase/func-v2-template>

## 如何运行

### tsc 编译

```sh
npx tsc -p cloudrunfunctions/func-a
npx tsc -p cloudrunfunctions/func-b
```

### 运行

分别运行 `func-a` 和 `func-b`：

```sh
tcb-ff --source=cloudrunfunctions/func-a
tcb-ff --source=cloudrunfunctions/func-b
```

一键运行所有函数：

```sh
tcb-ff --loadAllFunctions=true --functionsRoot=cloudrunfunctions
```

也可以进入函数目录运行代码，参考：[cloudrunfunctions/README.md](./cloudrunfunctions/README.md)

## 项目结构说明

```tree
.
├── README.md # 项目说明
├── cloudrunfunctions # 函数型云托管项目代码目录，每个目录对应一个函数
│   ├── README.md # 云函数说明
│   ├── func-a # 云函数 `func-a` 代码目录，单函数示例多函数
│   │   ├── README.md # 当前云函数说明
│   │   ├── built # TypeScript 编译后代码目录
│   │   ├── src   # TypeScript 源代码目录
│   │   ├── package.json
│   │   ├── cloudbase-functions.json # 云函数声明及配置文件
│   │   └── tsconfig.json # TypeScript 配置文件
│   └── func-b # 云函数 `func-b` 代码目录，单函数示例单函数
│       ├── README.md # 当前云函数说明
│       ├── built # TypeScript 编译后代码目录
│       ├── src   # TypeScript 源代码目录
│       ├── package.json
│       └── tsconfig.json # TypeScript 配置文件
├── node_modules  # node_modules [可能有]
├── package.json  # package.json [可能有]
├── tsconfig.json # tsconfig.json [可能有]
```

以上，是一个基于 `TypeScript` 的项目结构示例，项目中 需要 `src`、`built` 目录 包含 源代码和编译后的代码，因此需要在云函数代码中配置 `tsconfig.json` 文件。

因每个函数是独立部署的，所以每个函数也是相互独立的，但是代码结构比较相似。

非运行时依赖的部分，可以在多个函数之间共享，如 `tsconfig.json` `公共依赖` 等。

项目中还可能包含很多其他类型的文件，其他文件的组织根据项目需要进行即可。

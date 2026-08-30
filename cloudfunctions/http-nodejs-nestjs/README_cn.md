# Nest.js 模板

基于 Node.js 语言 Nest.js 框架实现的 HTTP 调用示例（CloudBase 云托管 / HTTP 函数）。

## 部署方式

该模板使用 CloudBase 预构建容器镜像直接部署，**无需本地构建**：

```text
imagePath:     crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-nestjs-example:v1.0.0
containerPort: 3000
```

通过 CloudBase 控制台或 `tcb` CLI 选用本模板时，会自动拉取上述镜像创建云托管/HTTP 函数实例。

## 源码参考

* GitHub: [cloudrun-nestjs](https://github.com/TencentCloudBase/cloudrun-nestjs)
* Gitee: [cloudrun-nestjs](https://gitee.com/TencentCloudBase/cloudrun-nestjs)

## 本地开发

```bash
git clone https://github.com/TencentCloudBase/cloudrun-nestjs.git
cd cloudrun-nestjs
npm install
npm run start:dev
```

## 说明

本目录仅作为模板元数据 (`cloudbase-template*.json`) 的载体，不携带源码。如需本地修改/构建镜像，请前往上方 `cloudrun-nestjs` 仓库。

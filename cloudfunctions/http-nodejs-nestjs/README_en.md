# Nest.js Template

HTTP example built with Node.js Nest.js framework, deployed as a CloudBase CloudRun / HTTP function.

## Deployment

This template ships as a CloudBase pre-built container image; **no local build is required**:

```text
imagePath:     crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-nestjs-example:v1.0.0
containerPort: 3000
```

Selecting this template via the CloudBase console or `tcb` CLI will spawn a CloudRun / HTTP function instance from the image above.

## Source Code

* GitHub: [cloudrun-nestjs](https://github.com/TencentCloudBase/cloudrun-nestjs)
* Gitee: [cloudrun-nestjs](https://gitee.com/TencentCloudBase/cloudrun-nestjs)

## Local Development

```bash
git clone https://github.com/TencentCloudBase/cloudrun-nestjs.git
cd cloudrun-nestjs
npm install
npm run start:dev
```

## Note

This directory only carries the template metadata (`cloudbase-template*.json`); the application source lives in the `cloudrun-nestjs` repository linked above.

# Django 云托管

基于 Django 框架的 CloudBase Run 容器部署示例。

## 快速开始

```bash
docker build -t python-django .
docker run -p 8080:8080 python-django
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

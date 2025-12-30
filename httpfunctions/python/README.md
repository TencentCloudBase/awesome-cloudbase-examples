# Python 快速开始

本文档介绍从零开始手动将一个 Python 应用部署到 CloudBase HTTP 云函数的中。该项目使用 flask 作为应用程序运行框架。

我们这里使用```python3.10```进行开发。

## 第1步: 编写基础应用

创建名为```helloworld-python```的新项目, 并进入此目录中:

```
mkdir helloworld-python
cd helloworld-python
```

创建虚拟环境

```
python -m venv env
source env/bin/activate # 激活虚拟环境
```

安装 flask 组件

```
python -m pip install flask
```

编写代码

```
服务端口目前只支持 9000。
```

```
import os
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello world!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9000)
```

## 第2步：管理项目依赖

安装依赖并生成 ```requirements.txt```

```
pip freeze > requirements.txt
```

编写 ```scf_bootstrap```

```
#!/bin/bash
export PYTHONPATH="./env/lib/python3.10/site-packages:$PYTHONPATH"
/var/lang/python39/bin/python3.9 manage.py
```

## 打包部署

将 ```helloworld-python``` 中文件打成 zip 包

```
zip -r -q helloworld-python.zip ./*
```

选择 HTTP 云函数 Python 运行时为 3.10, 然后上传 zip 包部署即可。

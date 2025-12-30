# Python 快速开始

本文档介绍从零开始手动将一个 Python 应用部署到 CloudBase HTTP 云函数的中。该项目使用 flask 作为应用程序运行框架。

我们这里使用```python3.10```进行开发。

## 第2步：编写基础应用

创建名为```helloworld-python```的新项目, 并进入此目录中:

```
mkdir helloworld-python
cd helloworld-python
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

创建虚拟环境

```
python -m venv env
source env/bin/activate # 激活虚拟环境
```

安装依赖并生成 ```requirements.txt```

```
pip freeze > requirements.txt
```

打包依赖

```
pip install -r requirements.txt -t ./libs
```



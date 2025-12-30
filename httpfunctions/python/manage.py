import os
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello world!'

if __name__ == '__main__':
    # 监听 0.0.0.0:8080
    app.run(host='0.0.0.0', port=9000)

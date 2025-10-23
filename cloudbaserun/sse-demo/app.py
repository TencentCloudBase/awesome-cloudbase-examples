from flask import Flask, Response
import time
import json
import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # 允许所有来源的跨域请求

@app.route('/stream')
def stream():
    def event_stream():
        count = 0
        while True:
            # 创建事件数据
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            data = {
                "count": count,
                "time": current_time,
                "message": f"这是第 {count} 条 SSE 消息"
            }
            
            # 按照 SSE 协议格式发送数据
            yield f"id: {count}\n"
            yield f"event: message\n"
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            
            count += 1
            time.sleep(2)  # 每2秒发送一次消息
    
    # 设置响应头，指定内容类型为 text/event-stream
    return Response(event_stream(), mimetype="text/event-stream")

@app.route('/')
def index():
    # 返回简单的 HTML 页面，用于测试 SSE
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Flask SSE 服务器</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 {
                color: #333;
            }
            .info {
                background-color: #f0f0f0;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            code {
                background-color: #e0e0e0;
                padding: 2px 4px;
                border-radius: 3px;
            }
        </style>
    </head>
    <body>
        <h1>Flask SSE 服务器</h1>
        <div class="info">
            <p>服务器已启动，SSE 端点可通过 <code>/stream</code> 访问。</p>
            <p>客户端可以连接到 <code>http://localhost:5000/stream</code> 接收事件。</p>
        </div>
    </body>
    </html>
    """

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
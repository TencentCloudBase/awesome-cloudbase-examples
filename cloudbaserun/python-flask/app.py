from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/')
def index():
    return jsonify({"message": "Hello World from Flask on CloudBase Run!", "timestamp": __import__('datetime').datetime.utcnow().isoformat() + "Z"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)

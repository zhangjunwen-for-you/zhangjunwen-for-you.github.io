from flask import Flask, send_from_directory
import os

# 创建 Flask 应用
app = Flask(__name__, static_folder=os.getcwd())

# 根目录，提供 index.html 文件
@app.route('/')
def serve_index():
    return send_from_directory(os.getcwd(), 'index.html')

# 动态处理所有其他静态文件请求，如 js、css 等
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.getcwd(), filename)

# 启动 Flask 服务
if __name__ == '__main__':
    app.run(debug=True)

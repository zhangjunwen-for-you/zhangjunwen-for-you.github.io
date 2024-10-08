
import os
import threading
import speech_recognition as sr

from flask import Flask, send_from_directory, jsonify

from audio.realtime_oneshot import long_running_listen, long_running_recognize, result_queue


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


@app.route('/heartbeat', methods=['GET'])
def heartbeat():
    r = result_queue.get() if not result_queue.empty() else None
    return jsonify({'cmd': r})


# 启动 Flask 服务
if __name__ == '__main__':
    r = sr.Recognizer()
    with sr.Microphone() as aud_source:
        # 校准环境噪声水平的energy threshold
        r.adjust_for_ambient_noise(aud_source, duration = 1)
        print('==== done adjusting for ambient noise ====')
        thread_listen = threading.Thread(target = long_running_listen, args = (r, aud_source))
        thread_rec = threading.Thread(target = long_running_recognize)
        thread_listen.start()
        thread_rec.start()

        app.run(debug=True)

        thread_listen.join()
        thread_rec.join()

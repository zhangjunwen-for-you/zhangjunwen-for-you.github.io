import speech_recognition as sr
from aip import AipSpeech
from pydub import AudioSegment
import os.path as path
import io
import queue
import threading


q = queue.Queue()


# 从麦克风获取音频并写入文件
def record_from_mic(recognizer, aud_source):
    audio = recognizer.listen(aud_source, phrase_time_limit = 2)
    return audio


def speech_to_text_baidu(audio):
    # https://cloud.baidu.com/product/speech 申请api
    app_id = "115695929"
    api_key = "CnpLkZWVxjvgZyK76S1pJUHu"
    secret_key = "nI1Pnsb14NQcd1KsXeuSVGhkqZONvCk8"
    client = AipSpeech(app_id, api_key, secret_key)

    seg: AudioSegment = AudioSegment.from_file(io.BytesIO(audio), format="wav")
    parsed = seg.set_frame_rate(16000).raw_data

    result = client.asr(
        parsed, 'pcm', 16000, {
        'dev_pid': 1537,  # 识别普通话，使用输入法模型
    })

    return result.get('result', [''])[0], f'<error> {result["err_msg"]} </error>' if 'success' not in result['err_msg'] else None


def long_running_listen(recognizer, aud_source):
    while True:
        audio = record_from_mic(recognizer, aud_source)
        q.put(audio)


def long_running_recognize():
    prev = None
    while True:
        audio = q.get().get_wav_data()
        # used = prev + audio if prev is not None else audio
        used = audio
        result, err = speech_to_text_baidu(used)
        print(result, err)
        prev = audio


if __name__ == "__main__":
    # 定义SpeechRecognition对象
    r = sr.Recognizer()
    with sr.Microphone() as aud_source:
        # 校准环境噪声水平的energy threshold
        r.adjust_for_ambient_noise(aud_source, duration = 1)
        print('==== done adjusting for ambient noise ====')
        thread_listen = threading.Thread(target = long_running_listen, args = (r, aud_source))
        thread_listen.start()
        long_running_recognize()
        thread_listen.join()

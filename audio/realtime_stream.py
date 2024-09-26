import pyaudio
from pydub import AudioSegment
from datetime import datetime
import time
import queue
import threading
from realtime_oneshot import speech_to_text_baidu

q = queue.Queue()

# 设置参数
CHUNK = 1024        # 每次捕获的帧数（音频块大小）
FORMAT = pyaudio.paInt16  # 音频格式（16位深度）
CHANNELS = 1        # 声道数（单声道）
RATE = 44100        # 采样率（每秒采样的帧数）

SAMPLE_DURATION_SECS = 2
MIN_REC_BATCHES = 2

# 初始化 PyAudio 实例
p = pyaudio.PyAudio()

# 打开流
stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK)


def run_receive_audio():
    print('start receiving audio')
    # 实时获取音频块并转换为 pydub.AudioSegment
    try:
        while True:
            frames = []
            for _ in range(0, int(RATE / CHUNK * SAMPLE_DURATION_SECS)):
                data = stream.read(CHUNK)
                frames.append(data)
            # 组合所有音频块
            audio_data = b''.join(frames)
            q.put(audio_data)
            # print(f'put {len(data)} data into queue')
    except KeyboardInterrupt:
        print('interrupted')


def run_recognize_audio():
    print('start recognizing audio')
    prev_chunks = []
    trials = 0
    while True:
        try:
            trials += 1
            begin_time = datetime.now()
            print(begin_time, 'begin recognizing, queue size:', q.qsize())
            prev_size = len(prev_chunks)
            while not q.empty():
                prev_chunks.append(q.get_nowait())
            inc_size = len(prev_chunks) - prev_size
            used_size = inc_size + 1 if inc_size > MIN_REC_BATCHES else MIN_REC_BATCHES + 1
            prev_chunks = prev_chunks[-used_size:]
            audio_segment = AudioSegment(
                data=b''.join(prev_chunks),
                sample_width=p.get_sample_size(FORMAT),
                frame_rate=RATE,
                channels=CHANNELS
            ).set_frame_rate(RATE).raw_data
            result, err = speech_to_text_baidu(audio_segment)
            print(result, err)
            end_time = datetime.now()
            print(end_time, 'end recognizing', trials)
            time.sleep(SAMPLE_DURATION_SECS - (end_time - begin_time).total_seconds())
        except queue.Empty:
            continue
        except TimeoutError:
            print('timeout')


threading.Thread(target=run_receive_audio).start()

run_recognize_audio()


# 关闭流
stream.stop_stream()
stream.close()
p.terminate()

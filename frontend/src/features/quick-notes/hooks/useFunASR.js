import { useState, useRef, useCallback } from 'react';

const FUNASR_WS_URL = import.meta.env.VITE_FUNASR_WS_URL || 'ws://localhost:10095';

/**
 * useFunASR — 语音识别 hook
 *
 * 优先使用 FunASR WebSocket，不可用时自动降级为浏览器 SpeechRecognition。
 *
 * 用法：
 *   const { start, stop, transcript, isListening, error, isFunASR } = useFunASR({
 *     hotwords: ['进程', '线程'],
 *     onSegment: ({ text, isFinal }) => { ... },
 *     onTranscriptChange: (text) => { ... },
 *   });
 *
 *   start() → 开始录音识别
 *   stop()  → 停止，返回完整文本
 */
export function useFunASR({ hotwords = [], onSegment: _onSegment, onTranscriptChange: _onTranscriptChange } = {}) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [isFunASR, setIsFunASR] = useState(null);
  // 用 ref 存回调，保证始终拿到最新值
  const onSegmentRef = useRef(_onSegment);
  const onTranscriptChangeRef = useRef(_onTranscriptChange);
  onSegmentRef.current = _onSegment;
  onTranscriptChangeRef.current = _onTranscriptChange;
  const isListeningRef = useRef(false);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // 检测 FunASR 是否可用（缓存结果，避免每次重试）
  const funasrAvailableRef = useRef(null);
  const checkFunASR = useCallback(async () => {
    if (funasrAvailableRef.current !== null) return funasrAvailableRef.current;
    try {
      const ws = new WebSocket(FUNASR_WS_URL);
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(reject, 2000);
      });
      ws.close();
      funasrAvailableRef.current = true;
      return true;
    } catch {
      funasrAvailableRef.current = false;
      return false;
    }
  }, []);

  // 浏览器 SpeechRecognition（降级方案）
  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge');
      setIsListening(false); isListeningRef.current = false;
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      const fullText = finalTranscriptRef.current + interim;
      setTranscript(fullText);
      onTranscriptChangeRef.current?.(fullText);
      if (final) onSegmentRef.current?.({ text: final, isFinal: true });
    };
    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setError('语音识别错误: ' + e.error);
      setIsListening(false); isListeningRef.current = false;
    };
    recognition.onend = () => {
      if (isListeningRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch(e) { console.warn("ASR restart:", e.message); }
        }, 100);
      }
    };
    recognition.start();
    setIsListening(true); isListeningRef.current = true;
  }, [isListening]);

  // 启动录音
  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    finalTranscriptRef.current = '';

    // 检测 FunASR
    const funasrAvailable = await checkFunASR();
    setIsFunASR(funasrAvailable);

    if (funasrAvailable) {
      // FunASR WebSocket 模式
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const ws = new WebSocket(FUNASR_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({
            mode: '2pass',
            chunk_size: [5, 10, 5],
            audio_fs: 16000,
            wav_name: 'timetree',
            is_speaking: true,
            hotwords: JSON.stringify(Object.fromEntries(hotwords.map(w => [w, 30]))),
            itn: true,
          }));
          setIsListening(true); isListeningRef.current = true;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              setTranscript(prev => prev + data.text);
              finalTranscriptRef.current += data.text;
              onTranscriptChangeRef.current?.(finalTranscriptRef.current);
              onSegmentRef.current?.({ text: data.text, isFinal: data.is_final !== false });
            }
          } catch { /* ignore non-JSON messages */ }
        };

        ws.onerror = () => { setError('语音识别连接失败，尝试降级...'); ws.close(); startBrowserRecognition(); };
        ws.onclose = () => { setIsListening(false); isListeningRef.current = false; };

        // 等 WebSocket 就绪
        await new Promise(r => { const c = () => ws.readyState === WebSocket.OPEN ? r() : setTimeout(c, 50); });

        // AudioContext 重采样到 16kHz PCM
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            ws.send(pcm16.buffer);
          }
        };
      } catch (err) {
        setError('麦克风访问失败: ' + (err.message || ''));
        setIsListening(false); isListeningRef.current = false;
      }
    } else {
      // 降级为浏览器 SpeechRecognition
      startBrowserRecognition();
    }
  }, [checkFunASR, hotwords, isListening, startBrowserRecognition]);

  // 停止录音
  const stop = useCallback(() => {
    // 关闭 FunASR WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ is_speaking: false }));
      setTimeout(() => wsRef.current?.close(), 500);
    }
    // 清理音频资源
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // 关闭浏览器语音识别
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false); isListeningRef.current = false;
  }, []);

  return { start, stop, transcript, isListening, error, isFunASR };
}

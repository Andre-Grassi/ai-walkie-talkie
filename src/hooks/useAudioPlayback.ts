import { useState, useCallback, useRef, useEffect } from 'react';
import { AUDIO_OUTPUT_SAMPLE_RATE } from '../utils/constants';
import { calculateAudioLevel, exportToWav } from '../utils/audio';
import { useExperimentalOptions } from '../contexts/ExperimentalOptionsContext';

/**
 * Converte buffer PCM 16-bit para Float32Array normalizado.
 */
function pcmBufferToFloat32(pcmData: ArrayBuffer): Float32Array {
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
    }

    return float32;
}

/**
 * Hook para reprodução de áudio PCM recebido do servidor.
 * Usa scheduled playback para reprodução suave (Direct Streaming).
 * 
 * Implementa lógica de "Drift Compensation" idêntica ao teste isolado
 * para garantir que não haja gaps ou sobreposições.
 */
export function useAudioPlayback() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    // Opções experimentais
    const { options } = useExperimentalOptions();

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);

    // Para scheduled playback
    const nextStartTimeRef = useRef(0);
    const currentSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    // Buffer completo para modo bufferAllAudio (Experimental)
    const fullBufferRef = useRef<ArrayBuffer[]>([]);

    // Histórico do último turno (para download/debug)
    const historyBufferRef = useRef<ArrayBuffer[]>([]);

    /**
     * Obtém ou cria o AudioContext
     */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
            console.log(`[AudioPlayback] AudioContext criado: ${audioContextRef.current.sampleRate}Hz`);

            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.connect(audioContextRef.current.destination);
        }
        return audioContextRef.current;
    }, []);

    /**
     * Atualiza o nível de áudio para visualização
     */
    const updateAudioLevel = useCallback(() => {
        if (!analyserRef.current || !isPlayingRef.current) {
            setAudioLevel(0);
            return;
        }

        const dataArray = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(dataArray);

        const level = calculateAudioLevel(dataArray);
        setAudioLevel(level);

        if (isPlayingRef.current) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
    }, []);

    /**
     * Agenda um AudioBuffer para reprodução
     */
    const scheduleBuffer = useCallback((audioContext: AudioContext, audioBuffer: AudioBuffer) => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        if (analyserRef.current) {
            source.connect(analyserRef.current);
        } else {
            source.connect(audioContext.destination);
        }

        const now = audioContext.currentTime;
        let startTime = nextStartTimeRef.current;

        // --- DRIFT COMPENSATION ---
        if (startTime < now) {
            const drift = now - startTime;
            if (drift > 0.05) { // 50ms de tolerância
                console.warn(`[AudioPlayback] Drift de ${drift.toFixed(3)}s detectado. Ressincronizando.`);
                startTime = now;
            }
        }

        // Agenda sempre no futuro ou agora
        startTime = Math.max(startTime, now);

        // Atualiza o ponteiro de tempo para o fim deste buffer
        nextStartTimeRef.current = startTime + audioBuffer.duration;

        source.start(startTime);
        currentSourcesRef.current.push(source);

        source.onended = () => {
            const index = currentSourcesRef.current.indexOf(source);
            if (index > -1) {
                currentSourcesRef.current.splice(index, 1);
            }

            if (currentSourcesRef.current.length === 0) {
                if (audioContext.currentTime >= nextStartTimeRef.current) {
                    isPlayingRef.current = false;
                    setIsPlaying(false);
                    setAudioLevel(0);
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                        animationFrameRef.current = null;
                    }
                }
            }
        };

        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            updateAudioLevel();
        }
    }, [updateAudioLevel]);

    /**
     * Adiciona áudio PCM à fila de reprodução.
     */
    const queueAudio = useCallback((pcmData: ArrayBuffer) => {
        // Guarda no histórico sempre (para download/debug)
        historyBufferRef.current.push(pcmData);

        if (options.bufferAllAudio) {
            fullBufferRef.current.push(pcmData);
            return;
        }

        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const float32Data = pcmBufferToFloat32(pcmData);
        const audioBuffer = audioContext.createBuffer(1, float32Data.length, AUDIO_OUTPUT_SAMPLE_RATE);
        audioBuffer.copyToChannel(float32Data, 0);

        scheduleBuffer(audioContext, audioBuffer);
    }, [options.bufferAllAudio, getAudioContext, scheduleBuffer]);

    /**
     * Reproduz todo o áudio acumulado (para modo bufferAllAudio).
     * Deve ser chamado quando receber turn_complete.
     */
    const flushAllBuffered = useCallback(() => {
        if (fullBufferRef.current.length === 0) return;

        console.log(`[AudioPlayback] Flush All Buffered: ${fullBufferRef.current.length} chunks`);

        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') audioContext.resume();

        nextStartTimeRef.current = audioContext.currentTime + 0.05;

        const chunks = [...fullBufferRef.current];
        fullBufferRef.current = [];

        for (const pcmData of chunks) {
            const float32Data = pcmBufferToFloat32(pcmData);
            const audioBuffer = audioContext.createBuffer(1, float32Data.length, AUDIO_OUTPUT_SAMPLE_RATE);
            audioBuffer.copyToChannel(float32Data, 0);
            scheduleBuffer(audioContext, audioBuffer);
        }
    }, [getAudioContext, scheduleBuffer]);

    /**
     * Reseta o estado de agendamento e histórico (chamado no início de cada turno)
     */
    const reset = useCallback(() => {
        console.log('[AudioPlayback] Resetting scheduler and history');
        nextStartTimeRef.current = 0;
        historyBufferRef.current = [];
        fullBufferRef.current = [];
    }, []);

    /**
     * Faz o download do áudio capturado no último turno como arquivo WAV
     */
    const downloadLastTurn = useCallback(() => {
        if (historyBufferRef.current.length === 0) {
            console.warn('[AudioPlayback] Nenhum áudio no histórico para download');
            return;
        }

        console.log(`[AudioPlayback] Exportando ${historyBufferRef.current.length} chunks para WAV`);
        const blob = exportToWav(historyBufferRef.current, AUDIO_OUTPUT_SAMPLE_RATE);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_response_${new Date().getTime()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    /**
     * Para toda reprodução
     */
    const stop = useCallback(() => {
        for (const source of currentSourcesRef.current) {
            try { source.stop(); } catch { }
        }
        currentSourcesRef.current = [];
        fullBufferRef.current = [];
        nextStartTimeRef.current = 0;

        isPlayingRef.current = false;
        setIsPlaying(false);
        setAudioLevel(0);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    /**
     * Cleanup
     */
    useEffect(() => {
        return () => {
            stop();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    return {
        isPlaying,
        audioLevel,
        queueAudio,
        flushAllBuffered,
        downloadLastTurn,
        reset,
        stop,
    };
}

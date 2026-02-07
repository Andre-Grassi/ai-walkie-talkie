import { useState, useCallback, useRef, useEffect } from 'react';
import { AUDIO_OUTPUT_SAMPLE_RATE } from '../utils/constants';
import { calculateAudioLevel } from '../utils/audio';
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
 * 
 * Quando bufferAllAudio está ativo, acumula TODOS os chunks e só reproduz
 * quando flushAllBuffered() é chamado (após turn_complete).
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

    /**
     * Obtém ou cria o AudioContext
     */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            // Cria AudioContext com sample rate nativo do dispositivo
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

        // --- DRIFT COMPENSATION (Igual ao Index.html) ---
        // Se o próximo tempo de início já passou (atraso na rede/processamento)
        if (startTime < now) {
            const drift = now - startTime;
            // Se o atraso for maior que 50ms, reseta para "agora"
            // Isso evita que o áudio tente tocar "rápido" para alcançar o tempo perdido
            if (drift > 0.05) {
                console.warn(`[AudioPlayback] Drift de ${drift.toFixed(3)}s detectado. Ressincronizando.`);
                startTime = now;
            }
        }

        // Agenda sempre no futuro ou agora (nunca no passado)
        // Se houver silêncio (startTime é antigo), o Math.max garante que começamos agora
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

            // Se acabaram os sources agendados
            if (currentSourcesRef.current.length === 0) {
                // Pequeno delay para garantir que não é apenas um gap entre packets
                // Mas aqui simplificamos para UI update
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

        // Garante que a UI mostre "tocando"
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
        // Modo bufferAllAudio: apenas acumula, não reproduz ainda
        if (options.bufferAllAudio) {
            fullBufferRef.current.push(pcmData);
            return;
        }

        // --- STREAMING DIRETO ---
        // Sem acumuladores intermediários, sem Jitter Buffer complexo.
        // Processa e toca assim que chega.

        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // 1. Converte PCM (Int16) -> Float32
        const float32Data = pcmBufferToFloat32(pcmData);

        // 2. Cria AudioBuffer
        const audioBuffer = audioContext.createBuffer(
            1,
            float32Data.length,
            AUDIO_OUTPUT_SAMPLE_RATE // 24kHz
        );
        audioBuffer.copyToChannel(float32Data, 0);

        // 3. Agenda imediatamente
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

        // Reseta o scheduler para começar agora + 50ms (pequeno buffer inicial)
        nextStartTimeRef.current = audioContext.currentTime + 0.05;

        // Toca tudo em sequência
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
     * Cleanup ao desmontar
     */
    useEffect(() => {
        return () => {
            stop();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stop]);

    // Stub para manter compatibilidade com interface antiga
    const flushProcessingBuffer = useCallback(() => { }, []);

    return {
        isPlaying,
        audioLevel,
        queueAudio,
        flushAllBuffered,
        flushProcessingBuffer,
        stop,
    };
}

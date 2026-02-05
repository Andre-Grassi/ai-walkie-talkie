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

// Configuração do jitter buffer (para modo normal)
const JITTER_BUFFER_SIZE = 3; // Acumula 3 chunks antes de começar (~120ms)
const BUFFER_LOOKAHEAD = 0.05; // 50ms de lookahead adicional

/**
 * Hook para reprodução de áudio PCM recebido do servidor.
 * Usa jitter buffer + scheduled playback para reprodução suave.
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

    // Jitter buffer - acumula chunks antes de reproduzir
    const bufferRef = useRef<AudioBuffer[]>([]);
    const isBufferingRef = useRef(true);

    // Buffer completo para modo bufferAllAudio
    const fullBufferRef = useRef<ArrayBuffer[]>([]);

    // Para scheduled playback
    const nextStartTimeRef = useRef(0);
    const currentSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    /**
     * Obtém ou cria o AudioContext
     */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            // Primeiro, cria um AudioContext sem especificar sample rate para ver o padrão do dispositivo
            const tempContext = new AudioContext();
            console.log(`[AudioPlayback] Sample rate do dispositivo: ${tempContext.sampleRate}Hz`);
            console.log(`[AudioPlayback] Sample rate esperado: ${AUDIO_OUTPUT_SAMPLE_RATE}Hz`);
            tempContext.close();

            // Agora cria o contexto com o sample rate correto
            audioContextRef.current = new AudioContext({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE });
            console.log(`[AudioPlayback] AudioContext criado com sample rate: ${audioContextRef.current.sampleRate}Hz`);

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
        const startTime = Math.max(now + BUFFER_LOOKAHEAD, nextStartTimeRef.current);
        nextStartTimeRef.current = startTime + audioBuffer.duration;

        source.start(startTime);
        currentSourcesRef.current.push(source);

        source.onended = () => {
            const index = currentSourcesRef.current.indexOf(source);
            if (index > -1) {
                currentSourcesRef.current.splice(index, 1);
            }

            if (currentSourcesRef.current.length === 0 && bufferRef.current.length === 0) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                setAudioLevel(0);
                nextStartTimeRef.current = 0;
                isBufferingRef.current = true;

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            }
        };
    }, []);

    /**
     * Inicia reprodução do buffer acumulado (modo jitter buffer)
     */
    const flushBuffer = useCallback((audioContext: AudioContext) => {
        isBufferingRef.current = false;

        while (bufferRef.current.length > 0) {
            const buffer = bufferRef.current.shift()!;
            scheduleBuffer(audioContext, buffer);
        }

        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            updateAudioLevel();
        }
    }, [scheduleBuffer, updateAudioLevel]);

    /**
     * Adiciona áudio PCM à fila de reprodução.
     */
    const queueAudio = useCallback((pcmData: ArrayBuffer) => {
        // Modo bufferAllAudio: apenas acumula, não reproduz ainda
        if (options.bufferAllAudio) {
            fullBufferRef.current.push(pcmData);
            console.log(`[AudioPlayback] Buffer acumulado: ${fullBufferRef.current.length} chunks`);
            return;
        }

        // Modo normal: jitter buffer + scheduled playback
        const audioContext = getAudioContext();

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const float32Data = pcmBufferToFloat32(pcmData);

        const audioBuffer = audioContext.createBuffer(
            1,
            float32Data.length,
            AUDIO_OUTPUT_SAMPLE_RATE
        );
        audioBuffer.copyToChannel(float32Data.slice(), 0);

        if (isBufferingRef.current) {
            bufferRef.current.push(audioBuffer);

            if (bufferRef.current.length >= JITTER_BUFFER_SIZE) {
                flushBuffer(audioContext);
            }
        } else {
            scheduleBuffer(audioContext, audioBuffer);

            if (!isPlayingRef.current) {
                isPlayingRef.current = true;
                setIsPlaying(true);
                updateAudioLevel();
            }
        }
    }, [options.bufferAllAudio, getAudioContext, flushBuffer, scheduleBuffer, updateAudioLevel]);

    /**
     * Reproduz todo o áudio acumulado (para modo bufferAllAudio).
     * Deve ser chamado quando receber turn_complete.
     * Usa scheduled playback para evitar problemas de concatenação.
     */
    const flushAllBuffered = useCallback(() => {
        if (fullBufferRef.current.length === 0) {
            console.log('[AudioPlayback] Nenhum áudio para reproduzir');
            return;
        }

        console.log(`[AudioPlayback] Agendando ${fullBufferRef.current.length} chunks para reprodução`);

        const audioContext = getAudioContext();

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Reset o nextStartTime antes de agendar
        nextStartTimeRef.current = audioContext.currentTime + 0.05; // 50ms de buffer inicial

        // Converte e agenda cada chunk em sequência
        const chunks = [...fullBufferRef.current];
        fullBufferRef.current = [];

        let lastSource: AudioBufferSourceNode | null = null;

        for (const pcmData of chunks) {
            const float32Data = pcmBufferToFloat32(pcmData);

            const audioBuffer = audioContext.createBuffer(
                1,
                float32Data.length,
                AUDIO_OUTPUT_SAMPLE_RATE
            );
            audioBuffer.copyToChannel(float32Data.slice(), 0);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;

            if (analyserRef.current) {
                source.connect(analyserRef.current);
            } else {
                source.connect(audioContext.destination);
            }

            const startTime = nextStartTimeRef.current;
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            source.start(startTime);
            currentSourcesRef.current.push(source);
            lastSource = source;
        }

        // Configura callback apenas no último source
        if (lastSource) {
            lastSource.onended = () => {
                currentSourcesRef.current = [];
                isPlayingRef.current = false;
                setIsPlaying(false);
                setAudioLevel(0);
                nextStartTimeRef.current = 0;

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            };
        }

        isPlayingRef.current = true;
        setIsPlaying(true);
        updateAudioLevel();
    }, [getAudioContext, updateAudioLevel]);

    /**
     * Para toda reprodução
     */
    const stop = useCallback(() => {
        for (const source of currentSourcesRef.current) {
            try {
                source.stop();
            } catch {
                // Ignora erros
            }
        }
        currentSourcesRef.current = [];
        bufferRef.current = [];
        fullBufferRef.current = [];
        nextStartTimeRef.current = 0;
        isBufferingRef.current = true;

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

    return {
        isPlaying,
        audioLevel,
        queueAudio,
        flushAllBuffered,
        stop,
    };
}

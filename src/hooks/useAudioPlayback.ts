import { useState, useCallback, useRef, useEffect } from 'react';
import { AUDIO_OUTPUT_SAMPLE_RATE } from '../utils/constants';
import { calculateAudioLevel } from '../utils/audio';

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
 * Usa scheduled playback para eliminar gaps entre chunks.
 */
export function useAudioPlayback() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);

    // Para scheduled playback - rastreia quando o próximo chunk deve começar
    const nextStartTimeRef = useRef(0);
    const currentSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    /**
     * Obtém ou cria o AudioContext
     */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE });
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
     * Adiciona áudio PCM à fila de reprodução usando scheduled playback.
     * Os chunks são agendados para tocar em sequência sem gaps.
     */
    const queueAudio = useCallback((pcmData: ArrayBuffer) => {
        const audioContext = getAudioContext();

        // Resume se suspenso (política de autoplay)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Converte PCM para Float32
        const float32Data = pcmBufferToFloat32(pcmData);

        // Cria AudioBuffer
        const audioBuffer = audioContext.createBuffer(
            1, // mono
            float32Data.length,
            AUDIO_OUTPUT_SAMPLE_RATE
        );
        audioBuffer.copyToChannel(float32Data, 0);

        // Cria source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Conecta ao analyser
        if (analyserRef.current) {
            source.connect(analyserRef.current);
        } else {
            source.connect(audioContext.destination);
        }

        // Calcula quando este chunk deve começar
        const now = audioContext.currentTime;
        const startTime = Math.max(now, nextStartTimeRef.current);

        // Agenda o próximo chunk para começar exatamente quando este terminar
        nextStartTimeRef.current = startTime + audioBuffer.duration;

        // Agenda e inicia
        source.start(startTime);
        currentSourcesRef.current.push(source);

        // Limpa sources terminados
        source.onended = () => {
            const index = currentSourcesRef.current.indexOf(source);
            if (index > -1) {
                currentSourcesRef.current.splice(index, 1);
            }

            // Se não há mais sources ativos, para a animação
            if (currentSourcesRef.current.length === 0) {
                isPlayingRef.current = false;
                setIsPlaying(false);
                setAudioLevel(0);
                nextStartTimeRef.current = 0;

                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            }
        };

        // Inicia a animação se não estiver rodando
        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            updateAudioLevel();
        }
    }, [getAudioContext, updateAudioLevel]);

    /**
     * Para toda reprodução
     */
    const stop = useCallback(() => {
        // Para todos os sources ativos
        for (const source of currentSourcesRef.current) {
            try {
                source.stop();
            } catch {
                // Ignora erros se já parou
            }
        }
        currentSourcesRef.current = [];
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

    return {
        isPlaying,
        audioLevel,
        queueAudio,
        stop,
    };
}

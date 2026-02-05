/**
 * Hook para reprodução de áudio PCM 24kHz da IA
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AUDIO_OUTPUT_SAMPLE_RATE } from '../utils/constants';
import { pcmBufferToFloat32, createAudioBuffer, calculateAudioLevel } from '../utils/audio';

interface UseAudioPlaybackReturn {
    isPlaying: boolean;
    queueAudio: (pcmData: ArrayBuffer) => void;
    stop: () => void;
    audioLevel: number;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const queueRef = useRef<AudioBuffer[]>([]);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isPlayingRef = useRef(false);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    /**
     * Obtém ou cria o AudioContext
     */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({
                sampleRate: AUDIO_OUTPUT_SAMPLE_RATE,
            });

            // Cria analyser para visualização
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.connect(audioContextRef.current.destination);
        }

        // Resume se estiver suspenso (política de autoplay)
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
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
     * Reproduz o próximo buffer da fila
     */
    const playNext = useCallback(() => {
        const audioContext = getAudioContext();

        if (queueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            setAudioLevel(0);

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            return;
        }

        const buffer = queueRef.current.shift()!;

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        // Conecta ao analyser (que já está conectado ao destination)
        if (analyserRef.current) {
            source.connect(analyserRef.current);
        } else {
            source.connect(audioContext.destination);
        }

        currentSourceRef.current = source;

        source.onended = () => {
            currentSourceRef.current = null;
            playNext();
        };

        source.start();

        if (!isPlayingRef.current) {
            isPlayingRef.current = true;
            setIsPlaying(true);
            updateAudioLevel();
        }
    }, [getAudioContext, updateAudioLevel]);

    /**
     * Adiciona áudio PCM à fila de reprodução
     */
    const queueAudio = useCallback((pcmData: ArrayBuffer) => {
        const audioContext = getAudioContext();

        // Converte PCM para Float32
        const float32Data = pcmBufferToFloat32(pcmData);

        // Cria AudioBuffer
        const audioBuffer = createAudioBuffer(audioContext, float32Data, AUDIO_OUTPUT_SAMPLE_RATE);

        // Adiciona à fila
        queueRef.current.push(audioBuffer);

        // Inicia reprodução se não estiver tocando
        if (!isPlayingRef.current) {
            playNext();
        }
    }, [getAudioContext, playNext]);

    /**
     * Para a reprodução e limpa a fila
     */
    const stop = useCallback(() => {
        // Para o source atual
        if (currentSourceRef.current) {
            currentSourceRef.current.stop();
            currentSourceRef.current.disconnect();
            currentSourceRef.current = null;
        }

        // Limpa a fila
        queueRef.current = [];

        // Para a animação
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        isPlayingRef.current = false;
        setIsPlaying(false);
        setAudioLevel(0);
    }, []);

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            stop();

            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, [stop]);

    return {
        isPlaying,
        queueAudio,
        stop,
        audioLevel,
    };
}

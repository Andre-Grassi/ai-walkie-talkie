/**
 * Hook para captura de áudio do microfone em formato PCM 16kHz
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    AUDIO_INPUT_SAMPLE_RATE,
    AUDIO_CHANNELS,
} from '../utils/constants';
import { float32ToInt16, calculateAudioLevel } from '../utils/audio';

interface UseAudioCaptureReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    audioLevel: number;
    error: string | null;
}

interface UseAudioCaptureOptions {
    onAudioData?: (pcmData: ArrayBuffer) => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
    const { onAudioData } = options;

    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const onAudioDataRef = useRef(onAudioData);

    // Mantém referência atualizada do callback
    useEffect(() => {
        onAudioDataRef.current = onAudioData;
    }, [onAudioData]);

    /**
     * Inicia a captura de áudio
     */
    const startRecording = useCallback(async () => {
        if (isRecording) return;

        setError(null);

        try {
            // Solicita permissão do microfone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: AUDIO_INPUT_SAMPLE_RATE,
                    channelCount: AUDIO_CHANNELS,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            mediaStreamRef.current = stream;

            // Cria AudioContext
            const audioContext = new AudioContext({
                sampleRate: AUDIO_INPUT_SAMPLE_RATE,
            });
            audioContextRef.current = audioContext;

            // Cria source do stream
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Calcula buffer size com base no intervalo desejado
            // ScriptProcessor precisa de potência de 2
            const bufferSize = 4096; // ~256ms a 16kHz

            // Cria processor para obter samples
            const processor = audioContext.createScriptProcessor(bufferSize, AUDIO_CHANNELS, AUDIO_CHANNELS);
            processorRef.current = processor;

            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);

                // Calcula nível de áudio para visualização
                const level = calculateAudioLevel(inputData);
                setAudioLevel(level);

                // Converte para PCM 16-bit
                const pcmData = float32ToInt16(inputData);

                // Envia para callback
                if (onAudioDataRef.current) {
                    onAudioDataRef.current(pcmData.buffer as ArrayBuffer);
                }
            };

            // Conecta: source -> processor -> destination (necessário para funcionar)
            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);

        } catch (err) {
            console.error('[AudioCapture] Erro ao iniciar:', err);

            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError') {
                    setError('Permissão de microfone negada');
                } else if (err.name === 'NotFoundError') {
                    setError('Microfone não encontrado');
                } else {
                    setError(`Erro de áudio: ${err.message}`);
                }
            } else {
                setError('Erro ao acessar microfone');
            }
        }
    }, [isRecording]);

    /**
     * Para a captura de áudio
     */
    const stopRecording = useCallback(() => {
        if (!isRecording) return;

        // Desconecta e limpa o processor
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        // Desconecta source
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        // Fecha AudioContext
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Para todas as tracks do stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        setIsRecording(false);
        setAudioLevel(0);
    }, [isRecording]);

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (isRecording) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                stopRecording();
            }
        };
    }, []);

    return {
        isRecording,
        startRecording,
        stopRecording,
        audioLevel,
        error,
    };
}

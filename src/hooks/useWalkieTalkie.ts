/**
 * Hook principal que coordena o estado do Walkie-Talkie
 * State machine que integra WebSocket, captura e reprodução de áudio
 */

import { useState, useCallback, useEffect } from 'react';
import type { WalkieTalkieState, ConnectionStatus } from '../types';
import { useWebSocket } from './useWebSocket';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import { VIBRATION_DURATION_MS, SUBTITLE_MAX_HISTORY } from '../utils/constants';

interface UseWalkieTalkieReturn {
    // Estado
    state: WalkieTalkieState;
    connectionStatus: ConnectionStatus;
    subtitles: string[];
    error: string | null;
    audioLevelIn: number;
    audioLevelOut: number;

    // Contexto
    context: string;
    setContext: (context: string) => void;
    isContextPanelOpen: boolean;
    openContextPanel: () => void;
    closeContextPanel: () => void;

    // Ações
    startTalking: () => void;
    stopTalking: () => void;
    reconnect: () => void;
}

export function useWalkieTalkie(): UseWalkieTalkieReturn {
    // Estado principal
    const [state, setState] = useState<WalkieTalkieState>('idle');
    const [subtitles, setSubtitles] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Contexto para a IA
    const [context, setContext] = useState('');
    const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

    // WebSocket
    const {
        status: connectionStatus,
        sendMessage,
        sendAudio,
        lastMessage,
        audioChunk,
        error: wsError,
        reconnect: wsReconnect,
    } = useWebSocket();

    // Captura de áudio
    const {
        startRecording,
        stopRecording,
        audioLevel: audioLevelIn,
        error: captureError,
    } = useAudioCapture({
        onAudioData: (pcmData) => {
            // Envia áudio para o WebSocket
            sendAudio(pcmData);
        },
    });

    // Reprodução de áudio
    const {
        isPlaying,
        queueAudio,
        stop: stopPlayback,
        audioLevel: audioLevelOut,
    } = useAudioPlayback();

    /**
     * Vibra o dispositivo (feedback tátil)
     */
    const vibrate = useCallback(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate(VIBRATION_DURATION_MS);
        }
    }, []);

    /**
     * Inicia a gravação (Press)
     */
    const startTalking = useCallback(async () => {
        if (connectionStatus !== 'ready' || state !== 'idle') {
            return;
        }

        vibrate();

        // Para qualquer playback em andamento
        stopPlayback();

        // Envia contexto se existir
        if (context.trim()) {
            sendMessage({ type: 'set_context', context: context.trim() });
        }

        // Inicia gravação
        await startRecording();

        // Notifica o servidor
        sendMessage({ type: 'start_talking' });

        setState('recording');
    }, [connectionStatus, state, vibrate, stopPlayback, context, sendMessage, startRecording]);

    /**
     * Para a gravação (Release)
     */
    const stopTalking = useCallback(() => {
        if (state !== 'recording') {
            return;
        }

        vibrate();

        // Para gravação
        stopRecording();

        // Notifica o servidor
        sendMessage({ type: 'stop_talking' });

        setState('processing');
    }, [state, vibrate, stopRecording, sendMessage]);

    /**
     * Abre o painel de contexto
     */
    const openContextPanel = useCallback(() => {
        setIsContextPanelOpen(true);
    }, []);

    /**
     * Fecha o painel de contexto
     */
    const closeContextPanel = useCallback(() => {
        setIsContextPanelOpen(false);
    }, []);

    /**
     * Força reconexão
     */
    const reconnect = useCallback(() => {
        wsReconnect();
        setState('idle');
        setError(null);
    }, [wsReconnect]);

    // Processa mensagens do WebSocket
    useEffect(() => {
        if (!lastMessage) return;

        switch (lastMessage.type) {
            case 'speaking':
                if (lastMessage.value === true) {
                    setState('playing');
                } else {
                    // IA parou de falar
                }
                break;

            case 'subtitle':
                if (lastMessage.text) {
                    setSubtitles(prev => {
                        const updated = [...prev, lastMessage.text!];
                        // Limita o histórico
                        if (updated.length > SUBTITLE_MAX_HISTORY) {
                            return updated.slice(-SUBTITLE_MAX_HISTORY);
                        }
                        return updated;
                    });
                }
                break;

            case 'turn_complete':
                setState('idle');
                break;

            case 'error':
                setError(lastMessage.message || 'Erro desconhecido');
                setState('error');
                break;
        }
    }, [lastMessage]);

    // Processa chunks de áudio recebidos
    useEffect(() => {
        if (audioChunk) {
            console.log('[Audio] Recebido chunk:', audioChunk.byteLength, 'bytes');
            queueAudio(audioChunk);
        }
    }, [audioChunk, queueAudio]);

    // Atualiza estado baseado no isPlaying
    useEffect(() => {
        if (isPlaying && state === 'processing') {
            setState('playing');
        }
    }, [isPlaying, state]);

    // Combina erros
    useEffect(() => {
        if (wsError) {
            setError(wsError);
        } else if (captureError) {
            setError(captureError);
        }
    }, [wsError, captureError]);

    // Reset estado quando conecta
    useEffect(() => {
        if (connectionStatus === 'ready') {
            setState('idle');
            setError(null);
        } else if (connectionStatus === 'disconnected') {
            setState('idle');
        }
    }, [connectionStatus]);

    return {
        state,
        connectionStatus,
        subtitles,
        error,
        audioLevelIn,
        audioLevelOut,
        context,
        setContext,
        isContextPanelOpen,
        openContextPanel,
        closeContextPanel,
        startTalking,
        stopTalking,
        reconnect,
    };
}

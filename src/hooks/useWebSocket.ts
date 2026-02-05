/**
 * Hook para gerenciamento de conexão WebSocket com AI Voice Bridge
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, ClientMessage, BridgeMessage } from '../types';
import {
    WEBSOCKET_URL,
    RECONNECT_BASE_DELAY_MS,
    RECONNECT_MAX_DELAY_MS,
    RECONNECT_MULTIPLIER
} from '../utils/constants';

interface UseWebSocketReturn {
    status: ConnectionStatus;
    sendMessage: (message: ClientMessage) => void;
    sendAudio: (audioData: ArrayBuffer) => void;
    lastMessage: BridgeMessage | null;
    audioChunk: ArrayBuffer | null;
    error: string | null;
    reconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<BridgeMessage | null>(null);
    const [audioChunk, setAudioChunk] = useState<ArrayBuffer | null>(null);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Calcula o delay de reconexão com backoff exponencial
     */
    const getReconnectDelay = useCallback(() => {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(RECONNECT_MULTIPLIER, reconnectAttemptRef.current);
        return Math.min(delay, RECONNECT_MAX_DELAY_MS);
    }, []);

    /**
     * Conecta ao WebSocket
     */
    const connect = useCallback(() => {
        // Limpa conexão anterior
        if (wsRef.current) {
            wsRef.current.close();
        }

        setStatus('connecting');
        setError(null);

        try {
            const ws = new WebSocket(WEBSOCKET_URL);
            wsRef.current = ws;

            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log('[WebSocket] Conectado');
                setStatus('connected');
                reconnectAttemptRef.current = 0;
            };

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Áudio binário da IA
                    setAudioChunk(event.data);
                } else if (typeof event.data === 'string') {
                    // Mensagem JSON
                    try {
                        const message: BridgeMessage = JSON.parse(event.data);
                        setLastMessage(message);

                        if (message.type === 'ready') {
                            setStatus('ready');
                        } else if (message.type === 'error') {
                            setError(message.message || 'Erro desconhecido');
                        }
                    } catch (e) {
                        console.error('[WebSocket] Erro ao parsear mensagem:', e);
                    }
                }
            };

            ws.onerror = (event) => {
                console.error('[WebSocket] Erro:', event);
                setError('Erro de conexão');
            };

            ws.onclose = (event) => {
                console.log('[WebSocket] Desconectado:', event.code, event.reason);
                setStatus('disconnected');
                wsRef.current = null;

                // Tenta reconectar automaticamente
                if (!event.wasClean) {
                    reconnectAttemptRef.current++;
                    const delay = getReconnectDelay();
                    console.log(`[WebSocket] Reconectando em ${delay}ms...`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                }
            };
        } catch (e) {
            console.error('[WebSocket] Erro ao criar conexão:', e);
            setError('Falha ao conectar');
            setStatus('disconnected');
        }
    }, [getReconnectDelay]);

    /**
     * Envia mensagem JSON
     */
    const sendMessage = useCallback((message: ClientMessage) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Tentativa de envio sem conexão ativa');
        }
    }, []);

    /**
     * Envia chunk de áudio binário
     */
    const sendAudio = useCallback((audioData: ArrayBuffer) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(audioData);
        }
    }, []);

    /**
     * Força reconexão manual
     */
    const reconnect = useCallback(() => {
        reconnectAttemptRef.current = 0;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        connect();
    }, [connect]);

    // Conecta automaticamente ao montar
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return {
        status,
        sendMessage,
        sendAudio,
        lastMessage,
        audioChunk,
        error,
        reconnect,
    };
}

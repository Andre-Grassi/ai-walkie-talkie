/**
 * Constantes da aplicação
 */

// === WebSocket ===
export const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8765';

// === Áudio ===
export const AUDIO_INPUT_SAMPLE_RATE = 16000;  // 16kHz para envio
export const AUDIO_OUTPUT_SAMPLE_RATE = 24000; // 24kHz para recebimento
export const AUDIO_CHANNELS = 1;               // Mono
export const AUDIO_CHUNK_MS = 100;             // Intervalo de chunks em ms

// === Reconexão ===
export const RECONNECT_BASE_DELAY_MS = 1000;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const RECONNECT_MULTIPLIER = 2;

// === UI ===
export const VIBRATION_DURATION_MS = 50;
export const SUBTITLE_MAX_HISTORY = 10;

// === Copyright ===
export const COPYRIGHT_TEXT = '© 2026 Andre Grassi de Jesus';
export const APP_NAME = 'AI Walkie-Talkie';
export const APP_VERSION = '1.0.0';

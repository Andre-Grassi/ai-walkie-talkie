/**
 * Tipos TypeScript para o AI Walkie-Talkie
 */

// === Estados da aplicação ===

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'ready';

export type WalkieTalkieState = 
  | 'idle'           // Pronto para usar
  | 'recording'      // Usuário está falando (TX)
  | 'processing'     // Aguardando resposta da IA
  | 'playing'        // IA está respondendo (RX)
  | 'error';         // Erro ocorreu

// === Mensagens do WebSocket ===

/** Mensagens enviadas pelo cliente para o Bridge */
export interface ClientMessage {
  type: 'start_talking' | 'stop_talking' | 'set_context';
  context?: string;
}

/** Mensagens recebidas do Bridge */
export interface BridgeMessage {
  type: 'connected' | 'ready' | 'speaking' | 'subtitle' | 'turn_complete' | 'error';
  value?: boolean;
  text?: string;
  message?: string;
}

// === Props de componentes ===

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  walkieState: WalkieTalkieState;
}

export interface WalkieTalkieButtonProps {
  state: WalkieTalkieState;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export interface SubtitleDisplayProps {
  subtitles: string[];
  isAISpeaking: boolean;
}

export interface ContextPanelProps {
  isOpen: boolean;
  context: string;
  onContextChange: (context: string) => void;
  onClose: () => void;
}

// === Hooks return types ===

export interface UseWebSocketReturn {
  status: ConnectionStatus;
  sendMessage: (message: ClientMessage) => void;
  sendAudio: (audioData: ArrayBuffer) => void;
  lastMessage: BridgeMessage | null;
  audioChunk: ArrayBuffer | null;
  error: string | null;
  reconnect: () => void;
}

export interface UseAudioCaptureReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioLevel: number;
  error: string | null;
}

export interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  queueAudio: (pcmData: ArrayBuffer) => void;
  stop: () => void;
  audioLevel: number;
}

export interface UseWalkieTalkieReturn {
  // Estado
  state: WalkieTalkieState;
  connectionStatus: ConnectionStatus;
  subtitles: string[];
  error: string | null;
  
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

/**
 * AI Walkie-Talkie - Aplicação Principal
 * Interface de walkie-talkie militar para comunicação com IA
 */

import { useWalkieTalkie } from './hooks/useWalkieTalkie';
import { WalkieTalkieButton } from './components/WalkieTalkieButton';
import { StatusIndicator } from './components/StatusIndicator';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { ContextPanel } from './components/ContextPanel';
import { COPYRIGHT_TEXT } from './utils/constants';
import './styles/global.css';
import styles from './App.module.css';

function App() {
  const {
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
  } = useWalkieTalkie();

  // Determina se o PTT está desabilitado
  const isPTTDisabled = connectionStatus !== 'ready' || state === 'processing';

  // Determina o nível de áudio a mostrar (entrada ou saída)
  const audioLevel = state === 'recording' ? audioLevelIn : audioLevelOut;

  return (
    <div className={styles.app}>
      {/* Header com status e botão de contexto */}
      <header className={styles.header}>
        <StatusIndicator
          connectionStatus={connectionStatus}
          walkieState={state}
          error={error}
        />

        <button
          className={styles.contextButton}
          onClick={openContextPanel}
          aria-label="Abrir painel de contexto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>CONTEXT</span>
          {context && <span className={styles.contextDot} />}
        </button>
      </header>

      {/* Área de legendas */}
      <main className={styles.main}>
        <SubtitleDisplay
          subtitles={subtitles}
          isAISpeaking={state === 'playing'}
        />
      </main>

      {/* Botão PTT fixo na parte inferior */}
      <footer className={styles.footer}>
        <WalkieTalkieButton
          state={state}
          disabled={isPTTDisabled}
          onPressStart={startTalking}
          onPressEnd={stopTalking}
          audioLevel={audioLevel}
        />

        {/* Botão de reconexão quando desconectado */}
        {connectionStatus === 'disconnected' && (
          <button
            className={styles.reconnectButton}
            onClick={reconnect}
          >
            RECONNECT
          </button>
        )}

        {/* Copyright */}
        <span className={styles.copyright}>{COPYRIGHT_TEXT}</span>
      </footer>

      {/* Modal de contexto */}
      <ContextPanel
        isOpen={isContextPanelOpen}
        context={context}
        onContextChange={setContext}
        onClose={closeContextPanel}
      />
    </div>
  );
}

export default App;

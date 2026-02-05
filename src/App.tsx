/**
 * AI Walkie-Talkie - Aplicação Principal
 * Interface de walkie-talkie militar para comunicação com IA
 */

import { useState } from 'react';
import { useWalkieTalkie } from './hooks/useWalkieTalkie';
import { WalkieTalkieButton } from './components/WalkieTalkieButton';
import { StatusIndicator } from './components/StatusIndicator';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { ContextPanel } from './components/ContextPanel';
import { ExperimentalPanel } from './components/ExperimentalPanel';
import { ExperimentalOptionsProvider } from './contexts/ExperimentalOptionsContext';
import { COPYRIGHT_TEXT } from './utils/constants';
import './styles/global.css';
import styles from './App.module.css';

function AppContent() {
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

  const [isExperimentalPanelOpen, setIsExperimentalPanelOpen] = useState(false);

  // Determina se o PTT está desabilitado
  const isPTTDisabled = connectionStatus !== 'ready' || state === 'processing';

  // Determina o nível de áudio a mostrar (entrada ou saída)
  const audioLevel = state === 'recording' ? audioLevelIn : audioLevelOut;

  return (
    <div className={styles.app}>
      {/* Header com status e botões */}
      <header className={styles.header}>
        <StatusIndicator
          connectionStatus={connectionStatus}
          walkieState={state}
          error={error}
        />

        <div className={styles.headerButtons}>
          {/* Botão Experimental */}
          <button
            className={styles.experimentalButton}
            onClick={() => setIsExperimentalPanelOpen(true)}
            aria-label="Abrir opções experimentais"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0-6v6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </button>

          {/* Botão Context */}
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
        </div>
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

      {/* Modal experimental */}
      <ExperimentalPanel
        isOpen={isExperimentalPanelOpen}
        onClose={() => setIsExperimentalPanelOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ExperimentalOptionsProvider>
      <AppContent />
    </ExperimentalOptionsProvider>
  );
}

export default App;


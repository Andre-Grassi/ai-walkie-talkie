---
trigger: model_decision
description: When working on the ai-walkie-talkie web app
---

# Project Context: AI Walkie-Talkie

## 1. Visão Geral

Web app **mobile-first** que simula um **walkie-talkie militar tático** para comunicação por voz com IA em tempo real. Utiliza o backend **AI Voice Bridge** para conexão com Gemini Live API.

**Características principais:**
- Interface push-to-talk (PTT) intuitiva
- **Design militar**: cores verde oliva, tipografia monospace, visual de equipamento tático
- **UX minimalista**: zero esforço cognitivo, funciona como app moderno
- PWA instalável com suporte offline parcial
- Latência mínima na captura e reprodução de áudio

**Princípio de Design:** *"Parece militar, funciona como um app moderno"*

## 2. Arquitetura

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│  AI Walkie-     │◄─────────────────►│  AI Voice       │◄─────────────────►│  Gemini Live    │
│  Talkie (Web)   │   audio + eventos  │  Bridge (Py)    │   audio + eventos  │      API        │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
         │
         ▼
    React 19 + TypeScript + Vite
```

## 3. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Framework** | React 19 | Hooks modernos, Suspense |
| **Linguagem** | TypeScript | Type safety, melhor DX |
| **Bundler** | Vite | Build rápido, HMR instantâneo |
| **Styling** | CSS Modules + CSS Variables | Zero runtime, theming nativo |
| **PWA** | Vite PWA Plugin | Service worker, manifest |
| **Deploy** | GitHub Pages / Vercel | Gratuito, fácil deploy |

## 4. Estrutura de Diretórios

```
ai-walkie-talkie/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── WalkieTalkieButton/
│   │   ├── StatusIndicator/
│   │   ├── SubtitleDisplay/
│   │   ├── ContextPanel/
│   │   └── AudioVisualizer/
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useAudioCapture.ts
│   │   ├── useAudioPlayback.ts
│   │   └── useWalkieTalkie.ts
│   ├── context/
│   │   └── WalkieTalkieContext.tsx
│   ├── styles/
│   │   ├── variables.css
│   │   ├── reset.css
│   │   └── global.css
│   ├── utils/
│   │   ├── audio.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 5. Design System

### Tema: Military Tactical Radio

**Paleta de Cores:**
```css
/* Backgrounds - Verde militar escuro */
--color-bg-primary: #0d1210;      /* Quase preto */
--color-bg-secondary: #1a2420;    /* Painel */
--color-bg-display: #0a0f0c;      /* Tela LCD */

/* Accent - Verde oliva tático */
--color-accent: #7cb342;          /* Principal */
--color-transmit: #ff7043;        /* TX (transmitindo) */
--color-receive: #42a5f5;         /* RX (recebendo) */

/* Texto - Alto contraste */
--color-text-primary: #e8f5e9;    /* Branco esverdeado */
--color-text-display: #7cb342;    /* Estilo LCD */
```

**Tipografia:**
- Display: `Orbitron` ou `Rajdhani` (estilo equipamento)
- Mono: `JetBrains Mono` (indicadores, status)
- Body: `Inter` (textos longos)

**Elementos Visuais:**
- Bordas simulando metal escovado
- Labels em CAPS LOCK estilo equipamento
- Indicadores LED circulares
- Botão PTT com efeito 3D físico
- Textura noise sutil no background

**Footer:**
- `© 2026 Andre Grassi de Jesus` - centralizado, cor `--color-text-muted`, muito discreto

### Estados do Botão PTT

| Estado | Cor | Feedback |
|--------|-----|----------|
| Idle | Verde escuro | - |
| Recording (TX) | Laranja TX pulsante | Vibração |
| AI Speaking (RX) | Azul RX glow | - |
| Error | Vermelho | Shake |

## 6. Custom Hooks

### `useWebSocket`
- Gerencia conexão WebSocket com AI Voice Bridge
- Auto-reconnect com backoff exponencial
- Diferencia mensagens texto/binário

### `useAudioCapture`
- Captura microfone usando AudioWorklet
- Output: PCM 16-bit, 16kHz, Mono
- Streaming em chunks ~100ms

### `useAudioPlayback`
- Reproduz áudio PCM da IA
- Input: PCM 16-bit, 24kHz, Mono
- Queue de buffers para playback contínuo

### `useWalkieTalkie`
- State machine central
- Coordena capture + playback + WebSocket
- Estados: idle → recording → processing → playing → idle

---

# AI Voice Bridge - WebSocket API

## Conexão

```javascript
const ws = new WebSocket('ws://localhost:8765');
```

## Protocolo

### Cliente → Bridge

```typescript
// Controle
{ type: 'start_talking' }
{ type: 'stop_talking' }

// Áudio: Binary frame (ArrayBuffer)
// PCM 16-bit, 16kHz, Mono
```

### Bridge → Cliente

```typescript
// Eventos JSON
{ type: 'connected' }
{ type: 'ready' }
{ type: 'speaking', value: boolean }
{ type: 'subtitle', text: string }
{ type: 'turn_complete' }
{ type: 'error', message: string }

// Áudio: Binary frame (ArrayBuffer)
// PCM 16-bit, 24kHz, Mono
```

## Fluxo Típico

```
1. Conecta → recebe "connected"
2. Inicializa → recebe "ready"
3. Press botão → envia "start_talking"
4. Fala → envia chunks de áudio binário
5. Release botão → envia "stop_talking"
6. IA processa → recebe "speaking: true"
7. IA responde → recebe áudio + "subtitle"
8. IA termina → recebe "speaking: false" + "turn_complete"
```

---

## Executando o Projeto

### Frontend (Este projeto)

```bash
npm install
npm run dev
# http://localhost:5173
```

### Backend (AI Voice Bridge)

```bash
cd f:\Dev\ai-voice-bridge
.\.venv\Scripts\Activate.ps1
python -m ai_voice_bridge
# ws://localhost:8765
```

---

## Instruções de Código

1. **Linguagem**: TypeScript strict mode
2. **Componentes**: Functional com hooks
3. **Styling**: CSS Modules (`.module.css`)
4. **Comentários**: Português brasileiro
5. **Código**: Inglês (variáveis, funções, etc.)
6. **Imports**: Path aliases (`@/components`, `@/hooks`)
7. **Linting**: ESLint + Prettier

## Convenções de Naming

- **Componentes**: PascalCase (`WalkieTalkieButton.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useWebSocket.ts`)
- **Estilos**: kebab-case (`walkie-talkie-button.module.css`)
- **Constantes**: SCREAMING_SNAKE_CASE (`WEBSOCKET_URL`)
- **Types/Interfaces**: PascalCase com prefixo `I` opcional (`BridgeMessage`)

---

## Política de Privacidade (Zero-Storage)

> **REGRA CRÍTICA**: O app NÃO armazena dados entre sessões.

| Proibido | Permitido |
|----------|-----------|
| ❌ `localStorage` | ✅ React `useState` |
| ❌ `sessionStorage` | ✅ React `useRef` |
| ❌ `cookies` | ✅ Context API |
| ❌ `IndexedDB` | ✅ Variáveis em memória |

**Razão**: Privacidade máxima do usuário. Ao fechar o app, tudo é perdido.

---

## Componentes Especiais

### ContextPanel (OVERLAY/MODAL)

> **REGRA DE OURO**: O botão PTT é SAGRADO. Nenhum elemento pode movê-lo.

O ContextPanel é um **modal overlay**, não um elemento inline:

**Comportamento:**
- Trigger: Botão "CONTEXT" no topo
- Abre como overlay com `position: fixed`
- Backdrop escuro semi-transparente (`rgba(0,0,0,0.7)`)
- Não afeta o layout do MainScreen
- PTT permanece no mesmo lugar

**Visual:**
- Text area centralizado na tela
- Fade overflow quando texto é muito longo
- Max height: ~60% da tela
- Scroll interno se necessário

**Privacidade**: Texto apenas em React state (nunca persistido)
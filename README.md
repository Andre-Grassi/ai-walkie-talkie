# 📻 AI Walkie-Talkie

Web app **mobile-first** que simula um **walkie-talkie militar tático** para comunicação por voz com IA em tempo real.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-7-purple)

## 🎯 Visão Geral

O AI Walkie-Talkie é uma interface push-to-talk (PTT) intuitiva que conecta você a uma IA conversacional via voz. Basta pressionar e segurar o botão para falar, e soltar para ouvir a resposta.

**Princípio de Design:** *"Parece militar, funciona como um app moderno"*

### Características

- 🎙️ **Push-to-Talk (PTT)** - Pressione e segure para falar
- 🤖 **IA em Tempo Real** - Comunicação via Gemini Live API
- 🎨 **Design Militar Tático** - Visual de equipamento de rádio
- 📱 **Mobile-First** - Otimizado para dispositivos móveis
- 🔒 **Privacidade Total** - Zero armazenamento de dados
- ⚡ **Baixa Latência** - Streaming de áudio em tempo real

## 🚀 Como Usar

### Pré-requisitos

- Node.js 18+
- [AI Voice Bridge](https://github.com/Andre-Grassi/ai-voice-bridge) rodando localmente

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Andre-Grassi/ai-walkie-talkie.git
cd ai-walkie-talkie

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Executando

1. **Inicie o backend** (AI Voice Bridge):
   ```bash
   cd ../ai-voice-bridge
   python -m ai_voice_bridge
   ```

2. **Acesse o app**: http://localhost:5173

3. **Permita o microfone** quando solicitado

4. **Use o PTT**: Pressione e segure o botão central para falar

## 🎨 Design

O app utiliza uma estética de **rádio militar tático**:

| Elemento | Descrição |
|----------|-----------|
| **Cores** | Verde oliva, laranja TX, azul RX |
| **Tipografia** | Orbitron (display), JetBrains Mono (indicadores) |
| **LEDs** | Indicadores de status estilo equipamento |
| **PTT** | Botão 3D com feedback visual e tátil |

### Estados do Botão

| Estado | Cor | Significado |
|--------|-----|-------------|
| 🟢 Idle | Verde | Pronto para usar |
| 🟠 Recording | Laranja pulsante | Transmitindo (TX) |
| 🔵 Playing | Azul | Recebendo resposta (RX) |
| 🔴 Error | Vermelho | Erro de conexão |

## 🏗️ Arquitetura

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     WebSocket      ┌─────────────────┐
│  AI Walkie-     │◄─────────────────►│  AI Voice       │◄─────────────────►│  Gemini Live    │
│  Talkie (Web)   │   audio + eventos  │  Bridge (Py)    │   audio + eventos  │      API        │
└─────────────────┘                    └─────────────────┘                    └─────────────────┘
```

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── WalkieTalkieButton/   # Botão PTT principal
│   ├── StatusIndicator/      # LED de status
│   ├── SubtitleDisplay/      # Legendas da IA
│   └── ContextPanel/         # Modal de contexto
├── hooks/
│   ├── useWebSocket.ts       # Conexão WebSocket
│   ├── useAudioCapture.ts    # Captura de áudio
│   ├── useAudioPlayback.ts   # Reprodução de áudio
│   └── useWalkieTalkie.ts    # State machine
├── styles/
│   └── variables.css         # Design tokens
└── types/
    └── index.ts              # Tipos TypeScript
```

## 🔒 Privacidade

Este app segue uma política de **zero armazenamento**:

- ❌ Sem cookies
- ❌ Sem localStorage
- ❌ Sem tracking
- ✅ Dados apenas em memória (RAM)
- ✅ Tudo é perdido ao fechar o app

## 📜 Scripts

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Gera build de produção
npm run preview  # Visualiza build de produção
npm run lint     # Executa linter
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

Desenvolvido com 💚 por [Andre Grassi de Jesus](https://github.com/Andre-Grassi)

/**
 * Painel de contexto - Modal overlay para input de contexto da IA
 * REGRA: Não move o botão PTT
 */

import { useRef, useEffect } from 'react';
import styles from './ContextPanel.module.css';

interface ContextPanelProps {
    isOpen: boolean;
    context: string;
    onContextChange: (context: string) => void;
    onClose: () => void;
}

export function ContextPanel({
    isOpen,
    context,
    onContextChange,
    onClose,
}: ContextPanelProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Focus no textarea quando abre
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isOpen]);

    // Fecha com Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Fecha ao clicar no backdrop
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={styles.backdrop}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="context-panel-title"
        >
            <div ref={panelRef} className={styles.panel}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="context-panel-title" className={styles.title}>
                        MISSION CONTEXT
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Fechar painel de contexto"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Descrição */}
                <p className={styles.description}>
                    Forneça contexto para a IA. Este texto será enviado no início da conversa.
                </p>

                {/* Text area */}
                <div className={styles.textareaContainer}>
                    <textarea
                        ref={textareaRef}
                        className={styles.textarea}
                        value={context}
                        onChange={(e) => onContextChange(e.target.value)}
                        placeholder="Ex: Você é um assistente de navegação espacial. Responda de forma técnica e concisa..."
                        maxLength={2000}
                    />
                    <div className={styles.fadeOverlay} />
                </div>

                {/* Footer com contador */}
                <div className={styles.footer}>
                    <span className={styles.charCount}>
                        {context.length} / 2000
                    </span>
                    <span className={styles.privacyHint}>
                        🔒 Seus dados não são salvos
                    </span>
                </div>

                {/* Botão de confirmar */}
                <button className={styles.confirmButton} onClick={onClose}>
                    CONFIRM
                </button>
            </div>
        </div>
    );
}

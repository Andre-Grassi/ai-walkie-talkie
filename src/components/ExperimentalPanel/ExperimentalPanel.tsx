/**
 * Painel de opções experimentais - Modal overlay para configurações de desenvolvimento
 */

import { useRef, useEffect } from 'react';
import { useExperimentalOptions } from '../../contexts/ExperimentalOptionsContext';
import styles from './ExperimentalPanel.module.css';

interface ExperimentalPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ExperimentalPanel({ isOpen, onClose }: ExperimentalPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { options, toggleOption } = useExperimentalOptions();

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
            aria-labelledby="experimental-panel-title"
        >
            <div ref={panelRef} className={styles.panel}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 id="experimental-panel-title" className={styles.title}>
                        ⚗️ EXPERIMENTAL
                    </h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Fechar painel experimental"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Descrição */}
                <p className={styles.description}>
                    Opções experimentais para testes. Use com cautela.
                </p>

                {/* Opções */}
                <div className={styles.optionsList}>
                    {/* Buffer All Audio */}
                    <label className={styles.option}>
                        <div className={styles.optionInfo}>
                            <span className={styles.optionName}>Buffer All Audio</span>
                            <span className={styles.optionDescription}>
                                Acumula todo o áudio e só reproduz após a resposta completa
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={options.bufferAllAudio}
                            onChange={() => toggleOption('bufferAllAudio')}
                            className={styles.toggle}
                        />
                    </label>

                    {/* Auto Download WAV */}
                    <label className={styles.option}>
                        <div className={styles.optionInfo}>
                            <span className={styles.optionName}>Auto Download Response (WAV)</span>
                            <span className={styles.optionDescription}>
                                Faz o download automático do áudio de cada resposta para o PC
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={options.autoDownloadWav}
                            onChange={() => toggleOption('autoDownloadWav')}
                            className={styles.toggle}
                        />
                    </label>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <span className={styles.warning}>
                        ⚠️ Estas opções podem afetar a experiência
                    </span>
                </div>

                {/* Botão de confirmar */}
                <button className={styles.confirmButton} onClick={onClose}>
                    CLOSE
                </button>
            </div>
        </div>
    );
}

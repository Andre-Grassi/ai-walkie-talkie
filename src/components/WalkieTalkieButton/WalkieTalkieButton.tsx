/**
 * Botão Push-to-Talk principal do Walkie-Talkie
 * Estilo militar com efeito 3D de botão físico
 */

import { useCallback, useRef, useEffect } from 'react';
import type { WalkieTalkieState } from '../../types';
import styles from './WalkieTalkieButton.module.css';

interface WalkieTalkieButtonProps {
    state: WalkieTalkieState;
    disabled?: boolean;
    onPressStart: () => void;
    onPressEnd: () => void;
    audioLevel?: number;
}

export function WalkieTalkieButton({
    state,
    disabled = false,
    onPressStart,
    onPressEnd,
    audioLevel = 0,
}: WalkieTalkieButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isPressedRef = useRef(false);

    /**
     * Handler para início do press (mouse/touch)
     */
    const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();

        if (disabled || isPressedRef.current) return;

        isPressedRef.current = true;
        onPressStart();
    }, [disabled, onPressStart]);

    /**
     * Handler para fim do press (mouse/touch)
     */
    const handlePressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();

        if (!isPressedRef.current) return;

        isPressedRef.current = false;
        onPressEnd();
    }, [onPressEnd]);

    /**
     * Handler para cancelamento (mouse leave, touch cancel)
     */
    const handleCancel = useCallback(() => {
        if (isPressedRef.current) {
            isPressedRef.current = false;
            onPressEnd();
        }
    }, [onPressEnd]);

    // Adiciona listeners globais para mouse up (caso o mouse saia do botão)
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isPressedRef.current) {
                isPressedRef.current = false;
                onPressEnd();
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('touchend', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('touchend', handleGlobalMouseUp);
        };
    }, [onPressEnd]);

    // Determina a classe de estado
    const stateClass = {
        idle: styles.idle,
        recording: styles.recording,
        processing: styles.processing,
        playing: styles.playing,
        error: styles.error,
    }[state];

    // Label do estado
    const stateLabel = {
        idle: 'PUSH TO TALK',
        recording: 'TRANSMITTING',
        processing: 'PROCESSING',
        playing: 'RECEIVING',
        error: 'ERROR',
    }[state];

    // Calcula o scale do glow baseado no áudio level
    const glowScale = 1 + audioLevel * 0.3;

    return (
        <div className={styles.container}>
            {/* Anel de glow animado */}
            <div
                className={`${styles.glowRing} ${state === 'recording' || state === 'playing' ? styles.glowActive : ''}`}
                style={{
                    transform: `scale(${glowScale})`,
                    opacity: audioLevel * 0.8 + 0.2,
                }}
            />

            {/* Botão principal */}
            <button
                ref={buttonRef}
                className={`${styles.button} ${stateClass} ${disabled ? styles.disabled : ''}`}
                disabled={disabled}
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handleCancel}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handleCancel}
                aria-label={stateLabel}
                aria-pressed={state === 'recording'}
            >
                {/* Ícone central */}
                <div className={styles.iconContainer}>
                    <svg
                        className={styles.icon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {state === 'recording' ? (
                            // Ícone de microfone ativo
                            <>
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                        ) : state === 'playing' ? (
                            // Ícone de alto-falante
                            <>
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </>
                        ) : (
                            // Ícone de microfone padrão
                            <>
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </>
                        )}
                    </svg>
                </div>

                {/* Label do estado */}
                <span className={styles.label}>{stateLabel}</span>
            </button>
        </div>
    );
}

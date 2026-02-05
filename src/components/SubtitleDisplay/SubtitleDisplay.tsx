/**
 * Painel de exibição de legendas/subtítulos da IA
 */

import { useRef, useEffect } from 'react';
import styles from './SubtitleDisplay.module.css';

interface SubtitleDisplayProps {
    subtitles: string[];
    isAISpeaking: boolean;
}

export function SubtitleDisplay({ subtitles, isAISpeaking }: SubtitleDisplayProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para o final quando novas legendas chegam
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [subtitles]);

    if (subtitles.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <span className={styles.emptyIcon}>📡</span>
                    <span className={styles.emptyText}>AWAITING TRANSMISSION</span>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${isAISpeaking ? styles.speaking : ''}`}
        >
            <div className={styles.content}>
                {subtitles.map((subtitle, index) => (
                    <p
                        key={index}
                        className={`${styles.subtitle} ${index === subtitles.length - 1 ? styles.latest : ''}`}
                    >
                        {subtitle}
                    </p>
                ))}
            </div>

            {/* Fade gradient no topo */}
            <div className={styles.fadeTop} />
        </div>
    );
}

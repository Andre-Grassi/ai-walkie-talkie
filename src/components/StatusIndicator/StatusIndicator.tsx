/**
 * Indicador de status da conexão
 * Estilo LED militar com labels
 */

import type { ConnectionStatus, WalkieTalkieState } from '../../types';
import styles from './StatusIndicator.module.css';

interface StatusIndicatorProps {
    connectionStatus: ConnectionStatus;
    walkieState: WalkieTalkieState;
    error?: string | null;
}

export function StatusIndicator({
    connectionStatus,
    walkieState,
    error,
}: StatusIndicatorProps) {
    // Determina o status a mostrar
    const getStatusInfo = () => {
        if (error) {
            return {
                label: 'ERROR',
                ledClass: styles.ledError,
                description: error,
            };
        }

        switch (connectionStatus) {
            case 'disconnected':
                return {
                    label: 'OFFLINE',
                    ledClass: styles.ledError,
                    description: 'Sem conexão',
                };
            case 'connecting':
                return {
                    label: 'CONNECTING',
                    ledClass: styles.ledWarning,
                    description: 'Conectando...',
                };
            case 'connected':
                return {
                    label: 'CONNECTED',
                    ledClass: styles.ledWarning,
                    description: 'Inicializando...',
                };
            case 'ready':
                // Quando ready, mostra o estado do walkie
                switch (walkieState) {
                    case 'recording':
                        return {
                            label: 'TX',
                            ledClass: styles.ledTransmit,
                            description: 'Transmitindo',
                        };
                    case 'processing':
                        return {
                            label: 'WAIT',
                            ledClass: styles.ledWarning,
                            description: 'Processando',
                        };
                    case 'playing':
                        return {
                            label: 'RX',
                            ledClass: styles.ledReceive,
                            description: 'Recebendo',
                        };
                    default:
                        return {
                            label: 'READY',
                            ledClass: styles.ledSuccess,
                            description: 'Pronto',
                        };
                }
        }
    };

    const { label, ledClass, description } = getStatusInfo();

    return (
        <div className={styles.container}>
            <div className={styles.statusRow}>
                <div className={`${styles.led} ${ledClass}`} />
                <span className={styles.label}>{label}</span>
            </div>
            <span className={styles.description}>{description}</span>
        </div>
    );
}

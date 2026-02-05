/**
 * Contexto para opções experimentais de desenvolvimento
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ExperimentalOptions {
    /** Armazena todos os chunks de áudio e só reproduz após turn_complete */
    bufferAllAudio: boolean;
}

interface ExperimentalOptionsContextType {
    options: ExperimentalOptions;
    setOption: <K extends keyof ExperimentalOptions>(key: K, value: ExperimentalOptions[K]) => void;
    toggleOption: (key: keyof ExperimentalOptions) => void;
}

const defaultOptions: ExperimentalOptions = {
    bufferAllAudio: false,
};

const ExperimentalOptionsContext = createContext<ExperimentalOptionsContextType | null>(null);

export function ExperimentalOptionsProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ExperimentalOptions>(defaultOptions);

    const setOption = useCallback(<K extends keyof ExperimentalOptions>(
        key: K,
        value: ExperimentalOptions[K]
    ) => {
        setOptions(prev => ({ ...prev, [key]: value }));
    }, []);

    const toggleOption = useCallback((key: keyof ExperimentalOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    return (
        <ExperimentalOptionsContext.Provider value={{ options, setOption, toggleOption }}>
            {children}
        </ExperimentalOptionsContext.Provider>
    );
}

export function useExperimentalOptions() {
    const context = useContext(ExperimentalOptionsContext);
    if (!context) {
        throw new Error('useExperimentalOptions must be used within ExperimentalOptionsProvider');
    }
    return context;
}

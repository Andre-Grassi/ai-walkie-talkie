/**
 * Utilitários de áudio para conversão PCM
 */

import { AUDIO_INPUT_SAMPLE_RATE, AUDIO_OUTPUT_SAMPLE_RATE } from './constants';

/**
 * Converte Float32Array (Web Audio) para Int16Array (PCM 16-bit)
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
        // Clamp para evitar clipping
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        // Converte para 16-bit signed integer
        int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return int16Array;
}

/**
 * Converte Int16Array (PCM 16-bit) para Float32Array (Web Audio)
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
        // Converte de 16-bit signed integer para float [-1, 1]
        float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
}

/**
 * Converte ArrayBuffer (PCM 16-bit) para Float32Array
 */
export function pcmBufferToFloat32(buffer: ArrayBuffer): Float32Array {
    const int16Array = new Int16Array(buffer);
    return int16ToFloat32(int16Array);
}

/**
 * Calcula o nível de áudio RMS (0-1) de um Float32Array
 */
export function calculateAudioLevel(samples: Float32Array): number {
    if (samples.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        sum += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sum / samples.length);
    // Normaliza para range mais sensível (0-1)
    return Math.min(1, rms * 3);
}

/**
 * Cria um AudioBuffer a partir de dados PCM Float32
 */
export function createAudioBuffer(
    audioContext: AudioContext,
    float32Data: Float32Array,
    sampleRate: number = AUDIO_OUTPUT_SAMPLE_RATE
): AudioBuffer {
    const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);
    return audioBuffer;
}

/**
 * Resample áudio de uma taxa para outra (simples linear interpolation)
 * Nota: Para produção, usar uma biblioteca de resampling mais precisa
 */
export function resampleAudio(
    input: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
): Float32Array {
    if (inputSampleRate === outputSampleRate) {
        return input;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
        const fraction = srcIndex - srcIndexFloor;

        // Linear interpolation
        output[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
    }

    return output;
}

/**
 * Valida se o sample rate é suportado
 */
export function isValidSampleRate(sampleRate: number): boolean {
    return sampleRate === AUDIO_INPUT_SAMPLE_RATE || sampleRate === AUDIO_OUTPUT_SAMPLE_RATE;
}

/**
 * Exporta múltiplos chunks PCM 16-bit para um Blob WAV
 */
export function exportToWav(chunks: ArrayBuffer[], sampleRate: number = AUDIO_OUTPUT_SAMPLE_RATE): Blob {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const wavBuffer = new ArrayBuffer(44 + totalLength);
    const view = new DataView(wavBuffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + totalLength, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, totalLength, true);

    // Escreve os dados PCM
    let offset = 44;
    for (const chunk of chunks) {
        const int16 = new Int16Array(chunk);
        for (let i = 0; i < int16.length; i++) {
            view.setInt16(offset, int16[i], true);
            offset += 2;
        }
    }

    return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

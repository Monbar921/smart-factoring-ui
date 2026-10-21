import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Браузер даёт crypto.subtle только в защищённом контексте: HTTPS или localhost. Стенд пока открыт по HTTP
 * на IP, и oidc-client-ts не может посчитать SHA-256 code challenge для PKCE - вход падает с ошибкой.
 * <p>
 * Без crypto.subtle подставляем digest('SHA-256') на чистом JS (@noble/hashes): PKCE работает так же.
 * Остальные методы subtle oidc-client-ts нужны только для DPoP, его мы не используем.
 * Когда стенды переедут на HTTPS, ветка не срабатывает и её можно убрать.
 */
export function installSubtleDigestFallback() {
  if (window.crypto.subtle) {
    return;
  }
  const digest = async (algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256') {
      throw new Error(`crypto.subtle недоступен по HTTP, запасной digest умеет только SHA-256, запрошен ${name}`);
    }
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    return sha256(bytes).slice().buffer;
  };
  Object.defineProperty(window.crypto, 'subtle', { value: { digest }, configurable: true });
}

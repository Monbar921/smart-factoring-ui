import { installSubtleDigestFallback } from './cryptoFallback';

describe('installSubtleDigestFallback', () => {
  const original = Object.getOwnPropertyDescriptor(window.crypto, 'subtle');

  afterEach(() => {
    if (original) {
      Object.defineProperty(window.crypto, 'subtle', original);
    } else {
      delete (window.crypto as { subtle?: unknown }).subtle;
    }
  });

  it('без crypto.subtle (HTTP) считает SHA-256 так же, как WebCrypto', async () => {
    const webCrypto = globalThis.crypto.subtle;
    const verifier = new TextEncoder().encode('code-verifier-'.repeat(8));
    const expected = new Uint8Array(await webCrypto.digest('SHA-256', verifier));
    Object.defineProperty(window.crypto, 'subtle', { value: undefined, configurable: true });

    installSubtleDigestFallback();

    expect(window.crypto.subtle).not.toBe(webCrypto);
    expect(new Uint8Array(await window.crypto.subtle.digest('SHA-256', verifier))).toEqual(expected);
    // кусок буфера со смещением: TextEncoder и Buffer отдают такие view
    const view = new Uint8Array([0, ...verifier, 0]).subarray(1, verifier.length + 1);
    expect(new Uint8Array(await window.crypto.subtle.digest({ name: 'sha-256' }, view))).toEqual(expected);
  });

  it('на другие алгоритмы падает явно', async () => {
    Object.defineProperty(window.crypto, 'subtle', { value: undefined, configurable: true });

    installSubtleDigestFallback();

    await expect(window.crypto.subtle.digest('SHA-384', new Uint8Array())).rejects.toThrow('SHA-384');
  });

  it('не трогает настоящий crypto.subtle', () => {
    const subtle = { digest: vi.fn() };
    Object.defineProperty(window.crypto, 'subtle', { value: subtle, configurable: true });

    installSubtleDigestFallback();

    expect(window.crypto.subtle).toBe(subtle);
  });
});

// ─── CryptoJS — global inyectado por el runtime de PrismHub ──────────────────
// PrismHub inyecta CryptoJS (v4.x) en el runtime QuickJS *solo* cuando el bundle
// de la extensión referencia el identificador `CryptoJS` (optimización: ahorra
// ~60 KB de parseo en las extensiones que no lo usan).
//
// Es un GLOBAL: no se importa. Solo úsalo directamente y TypeScript conocerá los
// tipos gracias a la declaración `declare global` de este archivo:
//
//   const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv });
//   const plain = bytes.toString(CryptoJS.enc.Utf8);
//
// Si tu extensión NO usa cifrado, ignora este archivo por completo.

interface WordArray {
  toString(encoder?: Encoder): string;
  words: number[];
  sigBytes: number;
}

interface Encoder {
  parse(str: string): WordArray;
  stringify(wordArray: WordArray): string;
}

interface CipherParams {
  ciphertext: WordArray;
  key?: WordArray;
  iv?: WordArray;
  salt?: WordArray;
  toString(encoder?: Encoder): string;
}

interface CipherOption {
  iv?: WordArray;
  mode?: unknown;
  padding?: unknown;
}

interface Hasher {
  (message: string | WordArray): WordArray;
}

interface Cipher {
  encrypt(
    message: string | WordArray,
    key: string | WordArray,
    cfg?: CipherOption,
  ): CipherParams;
  decrypt(
    ciphertext: string | CipherParams,
    key: string | WordArray,
    cfg?: CipherOption,
  ): WordArray;
}

export interface CryptoJSStatic {
  AES: Cipher;
  DES: Cipher;
  TripleDES: Cipher;
  RC4: Cipher;
  Rabbit: Cipher;

  MD5: Hasher;
  SHA1: Hasher;
  SHA256: Hasher;
  SHA512: Hasher;
  HmacSHA256(message: string | WordArray, key: string | WordArray): WordArray;

  enc: {
    Utf8: Encoder;
    Hex: Encoder;
    Base64: Encoder;
    Latin1: Encoder;
  };
  mode: { CBC: unknown; CFB: unknown; CTR: unknown; ECB: unknown; OFB: unknown };
  pad: {
    Pkcs7: unknown;
    NoPadding: unknown;
    ZeroPadding: unknown;
    Iso97971: unknown;
  };
  lib: { WordArray: { create(words?: number[], sigBytes?: number): WordArray } };
}

declare global {
  // Provisto por PrismHub en runtime. Solo presente si el bundle usa `CryptoJS`.
  const CryptoJS: CryptoJSStatic;
}

export {};

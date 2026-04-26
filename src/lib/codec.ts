import { fnv1a32, makeXorshift32 } from "./random";

const te = new TextEncoder();
const td = new TextDecoder();

function fnv1a32Bytes(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function u32ToBytesBE(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function bytesToU32BE(bytes: Uint8Array, offset = 0): number {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>>
    0
  );
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4;
  const b64 = (s + "=".repeat(padLen)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function xorBytes(data: Uint8Array, seed: number): Uint8Array {
  const rand = makeXorshift32(seed);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const k = Math.floor(rand() * 256) & 0xff;
    out[i] = data[i] ^ k;
  }
  return out;
}

export function encodeNameForUrl(name: string): string {
  return base64UrlEncode(te.encode(name));
}

export function decodeNameFromUrl(encoded: string): string {
  return td.decode(base64UrlDecode(encoded));
}

/**
 * Lightweight obfuscation (not security): XOR with deterministic keystream derived from drawId.
 */
export function encodeToken(drawId: string, secretName: string): string {
  const data = te.encode(secretName);
  const checksum = fnv1a32Bytes(data);
  const payload = new Uint8Array(4 + data.length);
  payload.set(u32ToBytesBE(checksum), 0);
  payload.set(data, 4);

  const obf = xorBytes(payload, fnv1a32(drawId));
  return base64UrlEncode(obf);
}

export function decodeToken(drawId: string, token: string): string {
  const obf = base64UrlDecode(token);
  const payload = xorBytes(obf, fnv1a32(drawId));
  if (payload.length < 5) {
    throw new Error("Token inválido.");
  }

  const expected = bytesToU32BE(payload, 0);
  const data = payload.slice(4);
  const actual = fnv1a32Bytes(data);
  if (actual !== expected) {
    throw new Error("Checksum inválido.");
  }

  return td.decode(data);
}


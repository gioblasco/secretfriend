import { fnv1a32, makeXorshift32 } from "./random";

const te = new TextEncoder();
const td = new TextDecoder();

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
  const obf = xorBytes(data, fnv1a32(drawId));
  return base64UrlEncode(obf);
}

export function decodeToken(drawId: string, token: string): string {
  const obf = base64UrlDecode(token);
  const data = xorBytes(obf, fnv1a32(drawId));
  return td.decode(data);
}


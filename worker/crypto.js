const TEXT_ENCODER = new TextEncoder();

export const PBKDF2_ITERATIONS = 100000;

export function normalizeUsername(raw) {
  const username = String(raw || "").trim();
  if (username.length < 3 || username.length > 24) {
    return {
      ok: false,
      error: "Username must be 3 to 24 characters long.",
    };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      ok: false,
      error: "Username can only use letters, numbers, dashes (-), and underscores (_).",
    };
  }
  return {
    ok: true,
    username,
    usernameLower: username.toLowerCase(),
  };
}

export function validatePin(raw) {
  const pin = typeof raw === "string" ? raw : String(raw ?? "");
  if (pin !== pin.trim()) {
    return {
      ok: false,
      error: "PIN or passcode cannot start or end with spaces.",
    };
  }
  if (pin.trim().length < 4 || pin.length > 64) {
    return {
      ok: false,
      error: "PIN or passcode must be 4 to 64 characters long.",
    };
  }
  if (/[\x00-\x1f\x7f]/.test(pin)) {
    return {
      ok: false,
      error: "PIN or passcode contains unsupported characters.",
    };
  }
  return { ok: true, pin };
}

export function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex) {
  const clean = String(hex || "").trim();
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error("Invalid hex string");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function sha256Bytes(input) {
  const bytes = input instanceof Uint8Array ? input : TEXT_ENCODER.encode(String(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

export async function sha256Hex(input) {
  return bytesToHex(await sha256Bytes(input));
}

export async function timingSafeEqualStrings(a, b) {
  const [ha, hb] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
  return timingSafeEqualBytes(ha, hb);
}

export async function hashPin(pin, { saltBytes = null, iterations = PBKDF2_ITERATIONS } = {}) {
  const salt = saltBytes || crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(String(pin)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return {
    hashHex: bytesToHex(new Uint8Array(derivedBits)),
    saltHex: bytesToHex(salt),
    iterations,
  };
}

export async function verifyPin(pin, storedHashHex, storedSaltHex, storedIterations = PBKDF2_ITERATIONS) {
  try {
    const saltBytes = hexToBytes(storedSaltHex);
    const derived = await hashPin(pin, {
      saltBytes,
      iterations: Number(storedIterations) || PBKDF2_ITERATIONS,
    });
    return timingSafeEqualBytes(hexToBytes(derived.hashHex), hexToBytes(storedHashHex));
  } catch {
    return false;
  }
}

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

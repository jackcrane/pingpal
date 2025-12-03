import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  constants as cryptoConstants,
  createHash,
  privateDecrypt,
  publicEncrypt,
} from "crypto";
import forge from "node-forge";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIGNING_DIR = path.resolve(__dirname, "../../../config/.signing");
const PUBLIC_KEY_PATH = path.join(SIGNING_DIR, "public.pem");
const PRIVATE_KEY_PATH = path.join(SIGNING_DIR, "private.pem");
const ENCRYPTED_PREFIX = "enc:rsa:v1:";
export const UNDECIPHERABLE_REASON = "UNDECIPHERABLE_SOURCE";

class SecretDecipherError extends Error {
  constructor(message = "Unable to decipher source") {
    super(message);
    this.code = UNDECIPHERABLE_REASON;
  }
}

const createDeterministicGenerator = (seed) => {
  const normalized = typeof seed === "string" ? seed : String(seed ?? "");
  let counter = 0;
  return (count) => {
    if (!Number.isFinite(count) || count <= 0) return "";
    const chunks = [];
    let produced = 0;
    while (produced < count) {
      const hash = createHash("sha256");
      hash.update(normalized);
      hash.update(String(counter));
      const chunk = hash.digest();
      chunks.push(chunk);
      produced += chunk.length;
      counter += 1;
    }
    return Buffer.concat(chunks).subarray(0, count).toString("binary");
  };
};

const generateKeyPairFromSeed = (seed) => {
  const prng = forge.random.createInstance();
  const getBytes = createDeterministicGenerator(seed);
  prng.getBytes = (count, callback) => {
    const bytes = getBytes(count);
    if (typeof callback === "function") {
      callback(null, bytes);
    }
    return bytes;
  };
  prng.getBytesSync = getBytes;
  prng.seedFileSync = getBytes;
  prng.generate = getBytes;

  const keyPair = forge.pki.rsa.generateKeyPair({
    bits: 2048,
    prng,
    workers: -1,
  });

  return {
    publicKeyPem: forge.pki.publicKeyToPem(keyPair.publicKey),
    privateKeyPem: forge.pki.privateKeyToPem(keyPair.privateKey),
  };
};

let signingState = null;

const loadSigningState = () => {
  if (signingState) return signingState;
  const seed = process.env.SIGN_SEED;
  if (!seed || typeof seed !== "string" || seed.trim().length === 0) {
    throw new Error("SIGN_SEED must be set to generate signing keys");
  }
  const { publicKeyPem, privateKeyPem } = generateKeyPairFromSeed(seed.trim());
  fs.mkdirSync(SIGNING_DIR, { recursive: true });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKeyPem, "utf-8");
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKeyPem, "utf-8");
  signingState = {
    seed: seed.trim(),
    publicKeyPem,
    privateKeyPem,
  };
  return signingState;
};

export const initSigning = () => {
  loadSigningState();
};

const ensureSigning = () => loadSigningState();

export const getPublicKeyPem = () => ensureSigning().publicKeyPem;

export const getPrivateKeyPem = () => ensureSigning().privateKeyPem;

export const encryptValue = (value) => {
  if (typeof value !== "string") {
    throw new Error("Value must be a string");
  }
  const plaintext = Buffer.from(value, "utf8");
  const encrypted = publicEncrypt(
    {
      key: getPublicKeyPem(),
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    plaintext
  );
  return `${ENCRYPTED_PREFIX}${encrypted.toString("base64")}`;
};

const attemptDecrypt = (payload) => {
  if (typeof payload !== "string" || payload.length === 0) {
    throw new SecretDecipherError("Missing encrypted payload");
  }
  const normalized = payload.startsWith(ENCRYPTED_PREFIX)
    ? payload.slice(ENCRYPTED_PREFIX.length)
    : payload;
  let buffer = null;
  try {
    buffer = Buffer.from(normalized, "base64");
  } catch (err) {
    throw new SecretDecipherError("Encrypted payload is not valid base64");
  }
  if (!buffer || buffer.length === 0) {
    throw new SecretDecipherError("Encrypted payload was empty");
  }
  try {
    const decrypted = privateDecrypt(
      {
        key: getPrivateKeyPem(),
        padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    );
    return decrypted.toString("utf8");
  } catch (err) {
    throw new SecretDecipherError("Encrypted payload could not be decrypted");
  }
};

export const decryptValue = (payload) => attemptDecrypt(payload);

const looksLikeHttpUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const looksLikeConnectionString = (value) => {
  if (typeof value !== "string") return false;
  if (/^[a-z]+:\/\//i.test(value)) return true;
  const hasAssignments =
    /host=/i.test(value) && /user=/i.test(value) && /password=/i.test(value);
  return hasAssignments;
};

const resolveSecret = (raw, detector) => {
  if (typeof raw === "string" && detector(raw)) {
    return { value: raw, encrypted: false };
  }
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const decrypted = decryptValue(raw);
      if (detector(decrypted)) {
        return { value: decrypted, encrypted: true };
      }
    } catch (err) {
      if (err instanceof SecretDecipherError) {
        throw err;
      }
      throw new SecretDecipherError(err.message);
    }
  }
  throw new SecretDecipherError("Value could not be interpreted");
};

export const resolveHttpTarget = (raw) =>
  resolveSecret(raw, looksLikeHttpUrl).value;

export const resolveConnectionString = (raw) =>
  resolveSecret(raw, looksLikeConnectionString).value;

export { SecretDecipherError, ENCRYPTED_PREFIX };

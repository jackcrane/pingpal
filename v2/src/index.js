import fs from "fs";
import { promises as fsPromises } from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { loadRoutes, Router } from "./lib/router.js";
import { initConfig, loadConfig } from "./lib/config.js";
import { getRedisClient } from "./lib/redis.js";
import { validateEnv } from "./lib/env.js";
import { initSigning } from "./lib/signing.js";
import { startWorker } from "./worker.js";

dotenv.config();
validateEnv();
initSigning();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_PREFIX = process.env.API_PREFIX || "/api";
const STATIC_ASSETS_DIR = process.env.STATIC_ASSETS_DIR
  ? path.resolve(process.env.STATIC_ASSETS_DIR)
  : path.resolve(__dirname, "../public");
const STATIC_INDEX_FILE = path.join(STATIC_ASSETS_DIR, "index.html");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const SIGN_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PingPal Secret Signer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: #1e293b;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.6);
    }
    h1 {
      margin-top: 0;
      font-size: 1.8rem;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    textarea {
      width: 100%;
      min-height: 120px;
      border-radius: 8px;
      border: 1px solid #334155;
      padding: 12px;
      resize: vertical;
      font-family: "SFMono-Regular", Menlo, Monaco, Consolas, monospace;
      font-size: 0.95rem;
      background: #0f172a;
      color: #e2e8f0;
      box-sizing: border-box;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 1rem;
      cursor: pointer;
      margin-top: 12px;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .status {
      margin-top: 12px;
      font-size: 0.9rem;
      color: #fbbf24;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>PingPal Secret Signer</h1>
    <p>Enter a URL or connection string below. We'll encrypt it with the workspace public key so you can store it in your config safely.</p>
    <div class="stack">
      <div>
        <label for="secret-input">Plaintext value</label>
        <textarea id="secret-input" placeholder="postgres://user:pass@host:5432/db"></textarea>
      </div>
      <div>
        <button id="encrypt-btn" disabled>Loading public key…</button>
        <span class="status" id="status"></span>
      </div>
      <div>
        <label for="secret-output">Encrypted value</label>
        <textarea id="secret-output" readonly placeholder="enc:rsa:v1:...."></textarea>
        <button id="copy-btn" disabled>Copy encrypted value</button>
      </div>
    </div>
  </div>
  <script>
    const state = {
      prefix: "enc:rsa:v1:",
      publicKeyPem: null,
      cryptoKey: null,
    };

    const statusEl = document.getElementById("status");
    const encryptBtn = document.getElementById("encrypt-btn");
    const copyBtn = document.getElementById("copy-btn");
    const inputEl = document.getElementById("secret-input");
    const outputEl = document.getElementById("secret-output");

    const setStatus = (text, danger = false) => {
      statusEl.textContent = text || "";
      statusEl.style.color = danger ? "#f87171" : "#fbbf24";
    };

    const arrayBufferToBase64 = (buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      return btoa(binary);
    };

    const importPublicKey = async (pem) => {
      const clean = pem
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\\s+/g, "");
      const binary = atob(clean);
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i += 1) {
        view[i] = binary.charCodeAt(i);
      }
      return crypto.subtle.importKey(
        "spki",
        buffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["encrypt"]
      );
    };

    const encryptValue = async () => {
      const raw = inputEl.value.trim();
      if (!raw) {
        setStatus("Enter a value to encrypt", true);
        return;
      }
      try {
        setStatus("Encrypting…");
        const encoded = new TextEncoder().encode(raw);
        const ciphertext = await crypto.subtle.encrypt(
          { name: "RSA-OAEP" },
          state.cryptoKey,
          encoded
        );
        const result = state.prefix + arrayBufferToBase64(ciphertext);
        outputEl.value = result;
        copyBtn.disabled = false;
        setStatus("Encrypted successfully! Paste this into your config.");
      } catch (err) {
        setStatus("Failed to encrypt: " + err.message, true);
      }
    };

    const copyValue = async () => {
      if (!outputEl.value) return;
      try {
        await navigator.clipboard.writeText(outputEl.value);
        setStatus("Encrypted value copied to clipboard");
      } catch (err) {
        setStatus("Copy failed: " + err.message, true);
      }
    };

    encryptBtn.addEventListener("click", encryptValue);
    copyBtn.addEventListener("click", copyValue);

    (async () => {
      try {
        setStatus("Fetching workspace public key…");
        const response = await fetch("/api/signing/public-key");
        if (!response.ok) {
          throw new Error("Server responded with " + response.status);
        }
        const payload = await response.json();
        state.publicKeyPem = payload.publicKey;
        state.prefix = payload.prefix || state.prefix;
        state.cryptoKey = await importPublicKey(state.publicKeyPem);
        encryptBtn.textContent = "Encrypt value";
        encryptBtn.disabled = false;
        setStatus("Ready to encrypt secrets.");
      } catch (err) {
        encryptBtn.textContent = "Encryption unavailable";
        setStatus("Unable to load public key: " + err.message, true);
      }
    })();
  </script>
</body>
</html>`;
const getMimeType = (filePath) =>
  MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

const safeJoin = (base, target) => {
  const cleanedTarget = target.replace(/^\/+/, "");
  const resolved = path.normalize(path.join(base, cleanedTarget));
  if (!resolved.startsWith(base)) {
    return null;
  }
  return resolved;
};

const fileStat = async (targetPath) => {
  try {
    return await fsPromises.stat(targetPath);
  } catch {
    return null;
  }
};

const streamFile = (filePath, res) =>
  new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });

const serveSignPage = (res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(SIGN_PAGE_HTML);
  return true;
};

const serveStatic = async (req, res, requestUrl) => {
  if (!["GET", "HEAD"].includes(req.method || "")) return false;
  if (!fs.existsSync(STATIC_ASSETS_DIR)) return false;

  try {
    const requestPath = decodeURIComponent(requestUrl.pathname || "/");
    const joinedPath = safeJoin(STATIC_ASSETS_DIR, requestPath);
    if (!joinedPath) {
      res.statusCode = 403;
      res.end("Forbidden");
      return true;
    }

    let filePath = joinedPath;
    let stat = await fileStat(filePath);
    if (stat && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      stat = await fileStat(filePath);
    }

    let servedFromIndex = false;
    if (!stat) {
      const hasExtension = path.extname(requestPath).length > 0;
      if (!hasExtension) {
        const fallbackStat = await fileStat(STATIC_INDEX_FILE);
        if (!fallbackStat) return false;
        filePath = STATIC_INDEX_FILE;
        stat = fallbackStat;
        servedFromIndex = true;
      } else {
        return false;
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", getMimeType(filePath));
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Cache-Control",
      servedFromIndex ? "no-cache" : "public, max-age=60"
    );

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    await streamFile(filePath, res);
    return true;
  } catch (err) {
    console.error("[static] Failed to serve asset:", err.message);
    res.statusCode = 500;
    res.end("Internal server error");
    return true;
  }
};

const buildRequestUrl = (req) => {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `http://${host}`);
};

const isApiRequest = (pathname) => {
  if (!pathname.startsWith("/")) return false;
  if (pathname === API_PREFIX) return true;
  return pathname.startsWith(`${API_PREFIX}/`);
};

const rewriteApiUrl = (requestUrl) => {
  const stripped =
    requestUrl.pathname.slice(API_PREFIX.length) || "/";
  return `${stripped.startsWith("/") ? stripped : `/${stripped}`}${
    requestUrl.search
  }`;
};

await initConfig();

const routes = await loadRoutes({
  routesDir: path.join(__dirname, "routes"),
});

// Ensure Redis connectivity at boot
await getRedisClient();

const router = new Router({
  routes,
  configLoader: loadConfig,
  getRedisClient,
});

const port = process.env.PORT || 2000;
const server = http.createServer(async (req, res) => {
  const requestUrl = buildRequestUrl(req);
  if (requestUrl.pathname === "/_/sign") {
    serveSignPage(res);
    return;
  }
  if (isApiRequest(requestUrl.pathname)) {
    const rewrittenUrl = rewriteApiUrl(requestUrl);
    const originalUrl = req.url;
    req.url = rewrittenUrl;
    await router.handle(req, res);
    req.url = originalUrl;
    return;
  }

  const servedStatic = await serveStatic(req, res, requestUrl);
  if (!servedStatic) {
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`PingPal v2 backend listening on :${port}`);
});

startWorker();

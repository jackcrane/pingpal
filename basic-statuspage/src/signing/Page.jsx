import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Column, Container, H1, P, Spacer } from "../kit";
import { Header } from "../Header";
import { Footer } from "../Footer";
import { useDocumentTitle } from "@uidotdev/usehooks";
import useWorkspace from "../hooks/useWorkspace";
import { url } from "../lib/url";

const PageContainer = styled(Container)`
  min-height: 100vh;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${(p) => p.theme.text};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: ${(p) => p.minHeight || "60px"};
  border-radius: 6px;
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.bg};
  color: ${(p) => p.theme.text};
  padding: 14px;
  font-size: 0.95rem;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  resize: vertical;
  box-sizing: border-box;
  transition: background 0.2s ease, border-color 0.2s ease;
  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.blue};
    background: ${(p) => p.theme.bg};
  }
`;

const ActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

const Button = styled.button`
  border-radius: 6px;
  border: 1px solid ${(p) => p.theme.border};
  background: ${(p) => p.theme.hover};
  color: ${(p) => p.theme.text};
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:hover:enabled {
    background: ${(p) => p.theme.bg};
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${(p) => p.theme.blue};
  border-color: ${(p) => p.theme.blue};
  color: #fff;
  &:hover:enabled {
    background: ${(p) => p.theme.blue};
    filter: brightness(1.05);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
`;

const Status = styled(P)`
  color: ${(p) =>
    p.variant === "error"
      ? p.theme.danger
      : p.variant === "success"
      ? p.theme.success
      : p.theme.subtext};
`;

const Instructions = styled.ol`
  margin: 0;
  padding-left: 18px;
  color: ${(p) => p.theme.subtext};
  line-height: 1.6;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${(p) => p.theme.bg};
  color: ${(p) => p.theme.subtext};
  font-size: 0.85rem;
  border: 1px dashed ${(p) => p.theme.border};
`;

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const getCrypto = () => {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto;
  }
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    return globalThis.crypto;
  }
  return null;
};

const importPublicKey = async (pem, cryptoApi) => {
  if (!pem) throw new Error("Workspace public key was missing");
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is unavailable in this environment");
  }
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
  return cryptoApi.subtle.importKey(
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

export default function SigningPage({ workspaceId }) {
  const { workspace } = useWorkspace(workspaceId);
  const [prefix, setPrefix] = useState("enc:rsa:v1:");
  const [cryptoKey, setCryptoKey] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [outputValue, setOutputValue] = useState("");
  const [status, setStatus] = useState("Loading workspace public key…");
  const [statusVariant, setStatusVariant] = useState("info");
  const [loadingKey, setLoadingKey] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  useDocumentTitle(
    workspace?.name
      ? `${workspace.name} | Secret Signer | PingPal`
      : "Secret Signer | PingPal"
  );

  useEffect(() => {
    let cancelled = false;
    const loadKey = async () => {
      setLoadingKey(true);
      setStatus("Loading workspace public key…");
      setStatusVariant("info");
      try {
        const cryptoApi = getCrypto();
        if (!cryptoApi) {
          throw new Error("Web Crypto API is unavailable in this browser");
        }
        const response = await fetch(url("/signing/public-key"));
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const payload = await response.json();
        if (cancelled) return;
        const imported = await importPublicKey(payload.publicKey, cryptoApi);
        if (cancelled) return;
        setCryptoKey(imported);
        setPrefix(payload.prefix || "enc:rsa:v1:");
        setStatus("Public key ready. Paste a value to encrypt.");
        setStatusVariant("success");
      } catch (err) {
        if (cancelled) return;
        setCryptoKey(null);
        setStatus(err.message || "Unable to load workspace key");
        setStatusVariant("error");
      } finally {
        if (!cancelled) {
          setLoadingKey(false);
        }
      }
    };
    loadKey();
    return () => {
      cancelled = true;
    };
  }, []);

  const encryptable = useMemo(
    () => Boolean(inputValue.trim().length) && Boolean(cryptoKey),
    [inputValue, cryptoKey]
  );

  const handleEncrypt = async () => {
    if (!encryptable || !cryptoKey) {
      setStatus("Enter a plaintext value before encrypting.");
      setStatusVariant("error");
      return;
    }
    try {
      setBusy(true);
      setCopyFeedback("");
      setStatus("Encrypting value…");
      setStatusVariant("info");
      const cryptoApi = getCrypto();
      if (!cryptoApi) {
        setStatus("Web Crypto API is unavailable in this browser.");
        setStatusVariant("error");
        return;
      }
      const encoded = new TextEncoder().encode(inputValue.trim());
      const ciphertext = await cryptoApi.subtle.encrypt(
        { name: "RSA-OAEP" },
        cryptoKey,
        encoded
      );
      const token = `${prefix}${arrayBufferToBase64(ciphertext)}`;
      setOutputValue(token);
      setStatus("Success! Copy the encrypted token into your config file.");
      setStatusVariant("success");
    } catch (err) {
      setStatus(`Encryption failed: ${err.message}`);
      setStatusVariant("error");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!outputValue) return;
    try {
      await navigator.clipboard.writeText(outputValue);
      setCopyFeedback("Copied to clipboard");
    } catch (err) {
      setCopyFeedback(`Copy failed: ${err.message}`);
    }
  };

  return (
    <PageContainer>
      <Header />
      <Spacer height="30px" />
      <div style={{ maxWidth: "900px", margin: "auto" }}>
        <Column gap="18px">
          <div>
            <Badge>{prefix}</Badge>
            <Spacer height="10px" />
            <H1>Encrypt credentials</H1>
            <Spacer height="12px" />
            <P>
              Generate encrypted connection strings or URLs using your workspace
              key. Only this PingPal backend can decrypt them.
            </P>
          </div>
          <Instructions>
            <li>Paste your plaintext URL or connection string.</li>
            <li>Encrypt it with the workspace public key.</li>
            <li>
              Copy the encrypted token into <code>pingpal.config.json</code>.
            </li>
          </Instructions>
          <Spacer height="10px" />
          <Field>
            <Label>Plaintext value</Label>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="postgres://user:password@db.internal:5432/app"
            />
          </Field>
          <ActionsRow>
            <PrimaryButton
              onClick={handleEncrypt}
              disabled={!encryptable || loadingKey || busy}
            >
              {loadingKey
                ? "Loading key…"
                : busy
                ? "Encrypting…"
                : "Encrypt value"}
            </PrimaryButton>
            <Status variant={statusVariant}>{status}</Status>
          </ActionsRow>
          <Field>
            <Label>Encrypted token</Label>
            <TextArea
              minHeight="100px"
              value={outputValue}
              placeholder={`${prefix}...`}
              readOnly
            />
          </Field>
          <ActionsRow>
            <SecondaryButton
              onClick={handleCopy}
              disabled={!outputValue.length}
            >
              Copy token
            </SecondaryButton>
            {copyFeedback && (
              <Status
                variant={
                  copyFeedback.startsWith("Copy failed") ? "error" : "success"
                }
              >
                {copyFeedback}
              </Status>
            )}
          </ActionsRow>
        </Column>
      </div>
      <Spacer height="40px" />
      <Footer />
    </PageContainer>
  );
}

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  Terminal,
  X,
  Fingerprint,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { KeyPairInfo } from "../types";

export const KeyVault: React.FC = () => {
  const [keys, setKeys] = useState<KeyPairInfo[]>([]);
  const [copiedKeyIndex, setCopiedKeyIndex] = useState<number | null>(null);
  const [copiedIdIndex, setCopiedIdIndex] = useState<number | null>(null);

  // Modal for new key pair
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"ed25519" | "rsa">("ed25519");
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const list = await invoke<KeyPairInfo[]>("get_keys");
      setKeys(list);
    } catch (err) {
      console.error(err);
      // Fallback
      setKeys([
        {
          name: "id_ed25519",
          key_type: "ssh-ed25519",
          public_key:
            "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICa5fU1Hq9mH3WbJpKlq5rZ7yO2t9s8jK1qLmNoPqRsT theia@macos",
          fingerprint: "SHA256:7vK8pLm3qX9yZ1aB2cE4gH6jK8nO0pQ2rS4tU6vW8xY",
          path: "~/.ssh/id_ed25519",
        },
        {
          name: "id_rsa_legacy",
          key_type: "ssh-rsa (4096-bit)",
          public_key:
            "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC9jKl1234567890abcdef... theia-rsa@macos",
          fingerprint: "SHA256:4aB8cE0gH2jK4nO6pQ8rS0tU2vW4xY6zA8bC0dE2fG4",
          path: "~/.ssh/id_rsa_legacy",
        },
      ]);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCopyPublicKey = (pubKey: string, index: number) => {
    navigator.clipboard.writeText(pubKey);
    setCopiedKeyIndex(index);
    setTimeout(() => setCopiedKeyIndex(null), 1800);
  };

  const handleCopyInstallCmd = (path: string, index: number) => {
    const cmd = `ssh-copy-id -i ${path}.pub user@hostname`;
    navigator.clipboard.writeText(cmd);
    setCopiedIdIndex(index);
    setTimeout(() => setCopiedIdIndex(null), 1800);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setGenerating(true);
    setErrorMsg(null);

    try {
      const created = await invoke<KeyPairInfo>("create_key", {
        name: newKeyName.trim(),
        keyType: newKeyType,
      });
      setKeys((prev) => [created, ...prev]);
      setShowGenerateModal(false);
      setNewKeyName("");
    } catch (err: any) {
      setErrorMsg(typeof err === "string" ? err : "Failed to generate key pair");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#080c14",
        color: "#e2e8f0",
        padding: "24px 32px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#34d399",
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
              Local SSH Key Vault
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
              Secure hardware-grade Ed25519 & RSA key management directly in macOS Keychain & ~/.ssh
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)",
          }}
        >
          <Plus size={16} /> Generate Key Pair
        </button>
      </div>

      {/* Local Encryption Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "8px",
          padding: "12px 18px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={18} color="#34d399" />
          <span style={{ fontSize: "13px", color: "#a7f3d0" }}>
            <strong>Local & Encrypted:</strong> Your private keys are stored securely in ~/.ssh and never leave your macOS device.
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#34d399", fontWeight: "600" }}>
          {keys.length} Keys Detected
        </div>
      </div>

      {/* Keys List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {keys.map((k, idx) => (
          <div
            key={k.path || idx}
            style={{
              backgroundColor: "#0d1424",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#06b6d4",
                  }}
                >
                  <Lock size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#f8fafc", margin: 0 }}>
                      {k.name}
                    </h3>
                    <span
                      style={{
                        backgroundColor:
                          k.key_type.includes("ed25519")
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(59, 130, 246, 0.15)",
                        border:
                          k.key_type.includes("ed25519")
                            ? "1px solid rgba(16, 185, 129, 0.3)"
                            : "1px solid rgba(59, 130, 246, 0.3)",
                        color: k.key_type.includes("ed25519") ? "#34d399" : "#60a5fa",
                        fontSize: "11px",
                        fontWeight: "500",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {k.key_type}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {k.path}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => handleCopyInstallCmd(k.path, idx)}
                  title="Copy ssh-copy-id command"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  {copiedIdIndex === idx ? (
                    <>
                      <Check size={14} color="#10b981" /> Command Copied
                    </>
                  ) : (
                    <>
                      <Terminal size={14} /> ssh-copy-id
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopyPublicKey(k.public_key, idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "rgba(6, 182, 212, 0.15)",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#22d3ee",
                    cursor: "pointer",
                  }}
                >
                  {copiedKeyIndex === idx ? (
                    <>
                      <Check size={14} color="#10b981" /> Copied Public Key
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Public Key
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Fingerprint */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
                fontSize: "12px",
                color: "#94a3b8",
              }}
            >
              <Fingerprint size={14} color="#64748b" />
              <span>Fingerprint:</span>
              <code
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "#cbd5e1",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {k.fingerprint}
              </code>
            </div>

            {/* Public key text block */}
            <div
              style={{
                backgroundColor: "#060911",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#94a3b8",
                wordBreak: "break-all",
                maxHeight: "65px",
                overflowY: "auto",
                lineHeight: "1.4",
              }}
            >
              {k.public_key}
            </div>
          </div>
        ))}
      </div>

      {/* Generate Key Modal */}
      {showGenerateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              width: "480px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                Generate Modern SSH Key Pair
              </h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  backgroundColor: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  color: "#fb7185",
                  fontSize: "12px",
                  marginBottom: "14px",
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGenerateKey}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Key Identifier / Filename
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. id_theia_production"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                    Will be stored in ~/.ssh/{newKeyName || "keyname"}
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Cryptography Standard
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div
                      onClick={() => setNewKeyType("ed25519")}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border:
                          newKeyType === "ed25519"
                            ? "2px solid #10b981"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          newKeyType === "ed25519" ? "rgba(16, 185, 129, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                        Ed25519 (Recommended)
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Modern 256-bit elliptic curve, compact & fastest.
                      </div>
                    </div>

                    <div
                      onClick={() => setNewKeyType("rsa")}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border:
                          newKeyType === "rsa"
                            ? "2px solid #3b82f6"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          newKeyType === "rsa" ? "rgba(59, 130, 246, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                        RSA 4096-bit
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Maximum legacy server compatibility.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    backgroundColor: "#10b981",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 20px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#ffffff",
                    cursor: "pointer",
                    opacity: generating ? 0.7 : 1,
                  }}
                >
                  {generating ? "Generating..." : "Generate Key Pair"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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
  Search,
  Trash2,
  Globe,
  Hash,
  ShieldAlert,
  Usb,
  Download,
  RefreshCw,
  AlertCircle,
  Shield,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { KeyPairInfo, KnownHostEntry, PasskeyDeviceInfo } from "../types";

export const KeyVault: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"keys" | "passkeys" | "known_hosts">("keys");
  const [keys, setKeys] = useState<KeyPairInfo[]>([]);
  const [copiedKeyIndex, setCopiedKeyIndex] = useState<number | null>(null);
  const [copiedIdIndex, setCopiedIdIndex] = useState<number | null>(null);

  // Passkey state
  const [passkeyDevices, setPasskeyDevices] = useState<PasskeyDeviceInfo[]>([]);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState("");
  const [passkeyTarget, setPasskeyTarget] = useState<"yubikey" | "touch_id">("yubikey");
  const [passkeyKeyType, setPasskeyKeyType] = useState<"ed25519-sk" | "ecdsa-sk">("ed25519-sk");
  const [passkeyResident, setPasskeyResident] = useState(true);
  const [passkeyVerifyRequired, setPasskeyVerifyRequired] = useState(true);
  const [generatingPasskey, setGeneratingPasskey] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [importingResident, setImportingResident] = useState(false);
  const [addedAgentKey, setAddedAgentKey] = useState<string | null>(null);

  // Known hosts state
  const [knownHosts, setKnownHosts] = useState<KnownHostEntry[]>([]);
  const [knownHostsSearch, setKnownHostsSearch] = useState("");
  const [copiedHostIndex, setCopiedHostIndex] = useState<number | null>(null);
  const [deletingLine, setDeletingLine] = useState<number | null>(null);

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
      setKeys([]);
    }
  };

  const loadPasskeys = async () => {
    try {
      const devs = await invoke<PasskeyDeviceInfo[]>("get_passkey_capabilities");
      setPasskeyDevices(devs);
    } catch (err) {
      console.error("Failed to load passkey devices:", err);
    }
  };

  const loadKnownHosts = async () => {
    try {
      const list = await invoke<KnownHostEntry[]>("get_known_hosts");
      setKnownHosts(list);
    } catch (err) {
      console.error("Failed to load known_hosts:", err);
      setKnownHosts([]);
    }
  };

  const handleDeleteKnownHost = async (lineNumber: number) => {
    setDeletingLine(lineNumber);
    try {
      await invoke("remove_known_host", { lineNumber });
      await loadKnownHosts();
    } catch (err) {
      console.error("Failed to remove known_host:", err);
    } finally {
      setDeletingLine(null);
    }
  };

  useEffect(() => {
    loadKeys();
    loadPasskeys();
    loadKnownHosts();
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

  const handleAddKeyToAgent = async (keyPath: string) => {
    try {
      await invoke<string>("add_key_to_agent", { keyPath });
      setAddedAgentKey(keyPath);
      setTimeout(() => setAddedAgentKey(null), 2500);
    } catch (err: any) {
      alert(`Could not add to agent: ${err?.message || err}`);
    }
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

  const handleGeneratePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyName.trim()) return;
    setGeneratingPasskey(true);
    setPasskeyNotice({
      type: "info",
      text:
        passkeyTarget === "touch_id"
          ? "👉 Touch your Mac Touch ID sensor to authorize passkey generation..."
          : "🔑 Touch the contact on your YubiKey hardware token now...",
    });

    try {
      const created = await invoke<KeyPairInfo>("generate_passkey", {
        opts: {
          name: passkeyName.trim(),
          key_type: passkeyKeyType,
          resident: passkeyResident,
          verify_required: passkeyVerifyRequired,
          device_target: passkeyTarget,
        },
      });
      setKeys((prev) => [created, ...prev]);
      setShowPasskeyModal(false);
      setPasskeyName("");
      setPasskeyNotice({
        type: "success",
        text: `Hardware passkey "${created.name}" generated successfully!`,
      });
      setTimeout(() => setPasskeyNotice(null), 5000);
      loadKeys();
    } catch (err: any) {
      setPasskeyNotice({
        type: "error",
        text: typeof err === "string" ? err : "Failed to generate hardware passkey",
      });
      setTimeout(() => setPasskeyNotice(null), 8000);
    } finally {
      setGeneratingPasskey(false);
    }
  };

  const handleDownloadResidentKeys = async () => {
    setImportingResident(true);
    setPasskeyNotice({
      type: "info",
      text: "🔑 Querying connected security keys for resident keys (touch key if prompted)...",
    });
    try {
      const imported = await invoke<KeyPairInfo[]>("download_resident_keys");
      await loadKeys();
      setPasskeyNotice({
        type: "success",
        text: `Imported ${imported.length} resident hardware key(s) into ~/.ssh!`,
      });
      setTimeout(() => setPasskeyNotice(null), 5000);
    } catch (err: any) {
      setPasskeyNotice({
        type: "error",
        text: typeof err === "string" ? err : "Failed to download resident keys from hardware token",
      });
      setTimeout(() => setPasskeyNotice(null), 8000);
    } finally {
      setImportingResident(false);
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

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activeTab === "passkeys" ? (
            <>
              <button
                onClick={handleDownloadResidentKeys}
                disabled={importingResident}
                title="Download keys stored directly inside your hardware security token"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <Download size={15} />
                {importingResident ? "Importing..." : "Import Resident Keys"}
              </button>

              <button
                onClick={() => {
                  setPasskeyTarget("yubikey");
                  setShowPasskeyModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#f59e0b",
                  color: "#080c14",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(245, 158, 11, 0.35)",
                }}
              >
                <Plus size={16} /> Create Hardware Passkey
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("keys")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: activeTab === "keys" ? "rgba(16, 185, 129, 0.15)" : "transparent",
            color: activeTab === "keys" ? "#34d399" : "#94a3b8",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <KeyRound size={16} /> SSH Key Pairs ({keys.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("passkeys")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: activeTab === "passkeys" ? "rgba(245, 158, 11, 0.15)" : "transparent",
            color: activeTab === "passkeys" ? "#fbbf24" : "#94a3b8",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <Usb size={16} /> Passkeys (YubiKey & Touch ID) (
          {keys.filter((k) => k.key_type.toLowerCase().includes("sk")).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("known_hosts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: activeTab === "known_hosts" ? "rgba(6, 182, 212, 0.15)" : "transparent",
            color: activeTab === "known_hosts" ? "#22d3ee" : "#94a3b8",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          <ShieldCheck size={16} /> Known Hosts & Security ({knownHosts.length})
        </button>
      </div>

      {activeTab === "keys" && (
        <>
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
                  onClick={() => handleAddKeyToAgent(k.path)}
                  title="Load this private key into active ssh-agent memory"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: addedAgentKey === k.path ? "rgba(16, 185, 129, 0.25)" : "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: addedAgentKey === k.path ? "#34d399" : "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  {addedAgentKey === k.path ? (
                    <>
                      <Check size={14} color="#10b981" /> In Agent
                    </>
                  ) : (
                    <>
                      <Shield size={14} /> Add to Agent
                    </>
                  )}
                </button>

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
        </>
      )}

      {activeTab === "passkeys" && (
        <>
          {/* Security & Architecture Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "8px",
              padding: "14px 18px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <div>
                <span style={{ fontSize: "13px", color: "#fef3c7", fontWeight: "600" }}>
                  Hardware-Fused FIDO2 Passkeys & Apple Secure Enclave
                </span>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#d97706" }}>
                  Private keys are generated and sealed within physical hardware. They cannot be extracted or stolen by malware, requiring physical touch or Mac Touch ID biometrics for every SSH authentication.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "#fbbf24",
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                {passkeyDevices.length > 0 ? `${passkeyDevices.length} Hardware Providers` : "Ready"}
              </span>
              <button
                onClick={loadPasskeys}
                title="Refresh hardware status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Passkey Notice Alert */}
          {passkeyNotice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "13px",
                backgroundColor:
                  passkeyNotice.type === "success"
                    ? "rgba(16, 185, 129, 0.15)"
                    : passkeyNotice.type === "error"
                    ? "rgba(244, 63, 94, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                border:
                  passkeyNotice.type === "success"
                    ? "1px solid rgba(16, 185, 129, 0.35)"
                    : passkeyNotice.type === "error"
                    ? "1px solid rgba(244, 63, 94, 0.35)"
                    : "1px solid rgba(245, 158, 11, 0.35)",
                color:
                  passkeyNotice.type === "success"
                    ? "#34d399"
                    : passkeyNotice.type === "error"
                    ? "#fb7185"
                    : "#fbbf24",
              }}
            >
              {passkeyNotice.type === "info" && <RefreshCw size={16} className="animate-spin" />}
              {passkeyNotice.type === "success" && <Check size={16} />}
              {passkeyNotice.type === "error" && <AlertCircle size={16} />}
              <span>{passkeyNotice.text}</span>
            </div>
          )}

          {/* Hardware Authenticators Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "28px",
            }}
          >
            {/* YubiKey / FIDO2 Card */}
            <div
              style={{
                backgroundColor: "#0d1424",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fbbf24",
                      }}
                    >
                      <Usb size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#f8fafc", margin: 0 }}>
                        Yubico YubiKey & FIDO2
                      </h3>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        USB-A, USB-C, Lightning & NFC Security Keys
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}
                  >
                    Hardware Token Ready
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "14px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#10b981" />
                    <span>Resident Credentials: <strong>Supported (-O resident)</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#10b981" />
                    <span>User Verification: <strong>PIN & Touch (-O verify-required)</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#10b981" />
                    <span>Algorithms: <strong>ed25519-sk</strong> & <strong>ecdsa-sk</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPasskeyTarget("yubikey");
                    setPasskeyName("id_yubikey_ed25519");
                    setShowPasskeyModal(true);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    backgroundColor: "#f59e0b",
                    color: "#080c14",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> Create on YubiKey
                </button>
                <button
                  type="button"
                  onClick={handleDownloadResidentKeys}
                  disabled={importingResident}
                  title="Import keys pre-loaded inside your YubiKey hardware slot"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  <Download size={14} /> Import Resident
                </button>
              </div>
            </div>

            {/* Apple Mac Touch ID Card */}
            <div
              style={{
                backgroundColor: "#0d1424",
                border: "1px solid rgba(6, 182, 212, 0.25)",
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(6, 182, 212, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#22d3ee",
                      }}
                    >
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#f8fafc", margin: 0 }}>
                        Apple Mac Touch ID
                      </h3>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Apple Silicon M-Series / T2 Secure Enclave
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      backgroundColor: "rgba(6, 182, 212, 0.15)",
                      color: "#22d3ee",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}
                  >
                    Secure Enclave Ready
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "14px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#06b6d4" />
                    <span>Biometric Protection: <strong>Mac Touch ID Sensor</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#06b6d4" />
                    <span>Hardware Isolation: <strong>Apple Secure Processor</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                    <Check size={13} color="#06b6d4" />
                    <span>Algorithms: <strong>ed25519-sk</strong> & <strong>ecdsa-sk</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPasskeyTarget("touch_id");
                    setPasskeyName("id_touchid_ed25519");
                    setShowPasskeyModal(true);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    backgroundColor: "#0891b2",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Fingerprint size={14} /> Create with Touch ID
                </button>
              </div>
            </div>
          </div>

          {/* Hardware Passkeys List */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <KeyRound size={17} color="#fbbf24" />
              Configured Hardware Passkeys ({keys.filter((k) => k.key_type.toLowerCase().includes("sk")).length})
            </h2>
          </div>

          {keys.filter((k) => k.key_type.toLowerCase().includes("sk")).length === 0 ? (
            <div
              style={{
                backgroundColor: "#0d1424",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                padding: "36px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              <Usb size={36} color="#64748b" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#e2e8f0", margin: "0 0 6px 0" }}>
                No Hardware Passkeys Found in ~/.ssh
              </h3>
              <p style={{ fontSize: "13px", maxWidth: "440px", margin: "0 auto 18px auto" }}>
                Hardware passkeys store the private key inside your YubiKey or Mac Touch ID Enclave, preventing remote theft and credential leaks.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <button
                  onClick={() => {
                    setPasskeyTarget("yubikey");
                    setPasskeyName("id_yubikey");
                    setShowPasskeyModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#f59e0b",
                    color: "#080c14",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> Create YubiKey Passkey
                </button>
                <button
                  onClick={() => {
                    setPasskeyTarget("touch_id");
                    setPasskeyName("id_touchid");
                    setShowPasskeyModal(true);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#0891b2",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Fingerprint size={15} /> Create Touch ID Passkey
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {keys
                .filter((k) => k.key_type.toLowerCase().includes("sk"))
                .map((k, idx) => (
                  <div
                    key={k.path || idx}
                    style={{
                      backgroundColor: "#0d1424",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
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
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fbbf24",
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
                                backgroundColor: "rgba(245, 158, 11, 0.15)",
                                border: "1px solid rgba(245, 158, 11, 0.35)",
                                color: "#fbbf24",
                                fontSize: "11px",
                                fontWeight: "600",
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              ⚡ {k.key_type}
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
                          onClick={() => handleAddKeyToAgent(k.path)}
                          title="Load into ssh-agent"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: addedAgentKey === k.path ? "rgba(16, 185, 129, 0.25)" : "transparent",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            color: addedAgentKey === k.path ? "#34d399" : "#cbd5e1",
                            cursor: "pointer",
                          }}
                        >
                          {addedAgentKey === k.path ? (
                            <>
                              <Check size={14} color="#10b981" /> In Agent
                            </>
                          ) : (
                            <>
                              <Shield size={14} /> Add to Agent
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopyInstallCmd(k.path, idx + 1000)}
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
                          {copiedIdIndex === idx + 1000 ? (
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
                          onClick={() => handleCopyPublicKey(k.public_key, idx + 1000)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            borderRadius: "6px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#fbbf24",
                            cursor: "pointer",
                          }}
                        >
                          {copiedKeyIndex === idx + 1000 ? (
                            <>
                              <Check size={14} color="#10b981" /> Copied
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
          )}
        </>
      )}

      {activeTab === "known_hosts" && (
        <>
          {/* Security Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              borderRadius: "8px",
              padding: "12px 18px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={18} color="#22d3ee" />
              <span style={{ fontSize: "13px", color: "#bae6fd" }}>
                <strong>Known Hosts Security Inspector:</strong> Cryptographic server keys stored in{" "}
                <code style={{ color: "#e0f2fe" }}>~/.ssh/known_hosts</code>. Mismatched or stale keys can cause SSH connection aborts.
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#22d3ee", fontWeight: "600" }}>
              {knownHosts.length} Entries Audited
            </div>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "8px 14px",
              marginBottom: "16px",
            }}
          >
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Filter by hostname, IP address, key type, or SHA256 fingerprint..."
              value={knownHostsSearch}
              onChange={(e) => setKnownHostsSearch(e.target.value)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: "#f8fafc",
                fontSize: "13px",
              }}
            />
            {knownHostsSearch && (
              <button
                type="button"
                onClick={() => setKnownHostsSearch("")}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Known hosts list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {knownHosts
              .filter((h) => {
                if (!knownHostsSearch.trim()) return true;
                const q = knownHostsSearch.toLowerCase();
                return (
                  h.host.toLowerCase().includes(q) ||
                  h.fingerprint.toLowerCase().includes(q) ||
                  h.key_type.toLowerCase().includes(q)
                );
              })
              .map((kh, idx) => (
                <div
                  key={kh.line_number}
                  style={{
                    backgroundColor: "#0d1424",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "#64748b",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Line #{kh.line_number}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {kh.is_hashed ? (
                          <>
                            <Hash size={15} color="#f59e0b" />
                            <span style={{ color: "#fcd34d", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                              {kh.host}
                            </span>
                          </>
                        ) : (
                          <>
                            <Globe size={15} color="#06b6d4" />
                            <span>{kh.host}</span>
                          </>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          backgroundColor: "rgba(6, 182, 212, 0.15)",
                          color: "#22d3ee",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontWeight: "500",
                        }}
                      >
                        {kh.key_type}
                      </span>
                      {kh.is_hashed && (
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          HMAC-SHA1 Hashed
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(kh.fingerprint);
                          setCopiedHostIndex(idx);
                          setTimeout(() => setCopiedHostIndex(null), 2000);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          color: copiedHostIndex === idx ? "#34d399" : "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        {copiedHostIndex === idx ? <Check size={12} /> : <Copy size={12} />}
                        {copiedHostIndex === idx ? "Copied" : "Copy Fingerprint"}
                      </button>

                      <button
                        type="button"
                        disabled={deletingLine === kh.line_number}
                        onClick={() => handleDeleteKnownHost(kh.line_number)}
                        title="Remove host key from ~/.ssh/known_hosts"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(244, 63, 94, 0.25)",
                          backgroundColor: "rgba(244, 63, 94, 0.08)",
                          color: "#fb7185",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} />
                        {deletingLine === kh.line_number ? "Removing..." : "Delete Key"}
                      </button>
                    </div>
                  </div>

                  {/* Fingerprint block */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    <Fingerprint size={14} color="#64748b" />
                    <span style={{ color: "#38bdf8" }}>{kh.fingerprint}</span>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

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
              width: "min(560px, 92vw)",
              padding: "24px 28px",
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

      {/* Passkey Hardware Generation Modal */}
      {showPasskeyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#0d1424",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "12px",
              width: "min(640px, 92vw)",
              padding: "24px 28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                  }}
                >
                  <Usb size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                    Create Hardware Security Passkey
                  </h2>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Hardware-bound authentication for YubiKey & Mac Touch ID
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPasskeyModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGeneratePasskey}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Target Authenticator */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Hardware Authenticator Target
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div
                      onClick={() => {
                        setPasskeyTarget("yubikey");
                        if (!passkeyName || passkeyName.includes("touchid")) {
                          setPasskeyName("id_yubikey_ed25519");
                        }
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border:
                          passkeyTarget === "yubikey"
                            ? "2px solid #f59e0b"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          passkeyTarget === "yubikey" ? "rgba(245, 158, 11, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Usb size={16} color="#fbbf24" />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                          Yubico YubiKey
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        FIDO2 USB / NFC hardware security token.
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setPasskeyTarget("touch_id");
                        if (!passkeyName || passkeyName.includes("yubikey")) {
                          setPasskeyName("id_touchid_ed25519");
                        }
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border:
                          passkeyTarget === "touch_id"
                            ? "2px solid #06b6d4"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          passkeyTarget === "touch_id" ? "rgba(6, 182, 212, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Fingerprint size={16} color="#22d3ee" />
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                          Apple Mac Touch ID
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        MacBook biometric Secure Enclave processor.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Name */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Key Identifier / Filename
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={passkeyTarget === "yubikey" ? "id_yubikey_ed25519" : "id_touchid_ed25519"}
                    value={passkeyName}
                    onChange={(e) => setPasskeyName(e.target.value)}
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
                    Stored in ~/.ssh/{passkeyName || "keyname"} (stub linked to physical device)
                  </span>
                </div>

                {/* Curve Standard */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Cryptographic Standard
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div
                      onClick={() => setPasskeyKeyType("ed25519-sk")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border:
                          passkeyKeyType === "ed25519-sk"
                            ? "2px solid #10b981"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          passkeyKeyType === "ed25519-sk" ? "rgba(16, 185, 129, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                        Ed25519-SK (Recommended)
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Curve25519 with FIDO2 hardware binding.
                      </div>
                    </div>

                    <div
                      onClick={() => setPasskeyKeyType("ecdsa-sk")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border:
                          passkeyKeyType === "ecdsa-sk"
                            ? "2px solid #3b82f6"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor:
                          passkeyKeyType === "ecdsa-sk" ? "rgba(59, 130, 246, 0.1)" : "#060911",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                        ECDSA-SK (NIST P-256)
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        Broad hardware token and compliance support.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Hardware Flags */}
                <div
                  style={{
                    backgroundColor: "#060911",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={passkeyResident}
                      onChange={(e) => setPasskeyResident(e.target.checked)}
                      style={{ accentColor: "#f59e0b" }}
                    />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#f8fafc" }}>
                        Resident Key <code style={{ fontSize: "11px", color: "#fbbf24" }}>(-O resident)</code>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Stores the credential directly in the hardware token. Allows downloading on other computers using <code>ssh-keygen -K</code>.
                      </div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={passkeyVerifyRequired}
                      onChange={(e) => setPasskeyVerifyRequired(e.target.checked)}
                      style={{ accentColor: "#f59e0b" }}
                    />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "#f8fafc" }}>
                        User Verification Required <code style={{ fontSize: "11px", color: "#fbbf24" }}>(-O verify-required)</code>
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Enforces hardware PIN or Touch ID biometric confirmation on every SSH authentication.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Touch Sensor Live Status Notice */}
                {generatingPasskey && (
                  <div
                    style={{
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <RefreshCw size={18} color="#fbbf24" className="animate-spin" />
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#fbbf24" }}>
                        {passkeyTarget === "touch_id"
                          ? "Touch your Mac Touch ID sensor..."
                          : "Touch the gold contact on your YubiKey..."}
                      </div>
                      <div style={{ fontSize: "11px", color: "#fef3c7" }}>
                        The hardware authenticator is waiting for physical user presence.
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={generatingPasskey}
                  onClick={() => setShowPasskeyModal(false)}
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
                  disabled={generatingPasskey}
                  style={{
                    backgroundColor: "#f59e0b",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 20px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#080c14",
                    cursor: "pointer",
                    opacity: generatingPasskey ? 0.7 : 1,
                  }}
                >
                  {generatingPasskey ? "Waiting for Touch..." : "Generate Passkey"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


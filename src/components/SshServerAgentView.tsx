import React, { useState, useEffect } from "react";
import {
  Server,
  Shield,
  Play,
  Square,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Terminal,
  Activity,
  Network,
  Info,
  Zap,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  SshAgentStatus,
  SshIdentity,
  SshServerStatus,
  SshServerConfig,
} from "../types";

export const SshServerAgentView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"server" | "agent">("server");

  // Server state
  const [serverStatus, setServerStatus] = useState<SshServerStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverPort, setServerPort] = useState(2222);
  const [listenAddress, setListenAddress] = useState("0.0.0.0");
  const [allowPassword, setAllowPassword] = useState(true);
  const [allowPubkey, setAllowPubkey] = useState(true);
  const [authorizedKeys, setAuthorizedKeys] = useState<string[]>([]);
  const [newAuthKey, setNewAuthKey] = useState("");
  const [showAddKeyInput, setShowAddKeyInput] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [serverMsg, setServerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Agent state
  const [agentStatus, setAgentStatus] = useState<SshAgentStatus | null>(null);
  const [agentIdentities, setAgentIdentities] = useState<SshIdentity[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [newKeyPath, setNewKeyPath] = useState("~/.ssh/id_ed25519");
  const [keyLifetime, setKeyLifetime] = useState<number | "unlimited">("unlimited");
  const [agentMsg, setAgentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ==================== Server Functions ====================
  const loadServerStatus = async () => {
    try {
      const status = await invoke<SshServerStatus>("get_ssh_server_status");
      setServerStatus(status);
      setServerPort(status.port);
      setListenAddress(status.listen_address);
      const authKeys = await invoke<string[]>("get_server_authorized_keys");
      setAuthorizedKeys(authKeys);
    } catch (err) {
      console.error("Failed to load server status:", err);
    }
  };

  const handleStartServer = async () => {
    setServerLoading(true);
    try {
      const config: SshServerConfig = {
        port: Number(serverPort) || 2222,
        listen_address: listenAddress,
        allow_password: allowPassword,
        allow_pubkey: allowPubkey,
      };
      const status = await invoke<SshServerStatus>("start_ssh_server", { config });
      setServerStatus(status);
      loadServerStatus();
    } catch (err: any) {
      alert(`Failed to start SSH server: ${err?.message || err}`);
    } finally {
      setServerLoading(false);
    }
  };

  const handleStopServer = async () => {
    setServerLoading(true);
    try {
      const status = await invoke<SshServerStatus>("stop_ssh_server");
      setServerStatus(status);
      loadServerStatus();
    } catch (err: any) {
      alert(`Failed to stop SSH server: ${err?.message || err}`);
    } finally {
      setServerLoading(false);
    }
  };

  const handleAddAuthorizedKey = async () => {
    if (!newAuthKey.trim()) return;
    try {
      const updated = await invoke<string[]>("add_server_authorized_key", {
        key: newAuthKey.trim(),
      });
      setAuthorizedKeys(updated);
      setNewAuthKey("");
      setShowAddKeyInput(false);
      loadServerStatus();
    } catch (err: any) {
      alert(`Failed to add authorized key: ${err?.message || err}`);
    }
  };

  const [isAutoConfiguringServer, setIsAutoConfiguringServer] = useState(false);
  const [isAutoConfiguringAgent, setIsAutoConfiguringAgent] = useState(false);
  const [confirmPurgeKeys, setConfirmPurgeKeys] = useState(false);

  const handleAutoConfigureServer = async () => {
    setIsAutoConfiguringServer(true);
    try {
      const res = await invoke<any>("auto_configure_ssh_server");
      const msgText =
        typeof res === "string"
          ? res
          : res?.port
          ? `SSH Server active on port ${res.port}`
          : "SSH Server configured successfully";
      setServerMsg({ type: "success", text: msgText });
      setTimeout(() => setServerMsg(null), 5000);
      loadServerStatus();
    } catch (err: any) {
      setServerMsg({ type: "error", text: err?.message || String(err) });
      setTimeout(() => setServerMsg(null), 5000);
    } finally {
      setIsAutoConfiguringServer(false);
    }
  };

  const handleAutoConfigureAgent = async () => {
    setIsAutoConfiguringAgent(true);
    try {
      const res = await invoke<string>("auto_configure_ssh_agent");
      setAgentMsg({ type: "success", text: res });
      setTimeout(() => setAgentMsg(null), 4000);
      loadAgentStatus();
    } catch (err: any) {
      setAgentMsg({ type: "error", text: err?.message || String(err) });
      setTimeout(() => setAgentMsg(null), 5000);
    } finally {
      setIsAutoConfiguringAgent(false);
    }
  };

  const handleRemoveAuthorizedKey = async (key: string) => {
    try {
      const updated = await invoke<string[]>("remove_server_authorized_key", { key });
      setAuthorizedKeys(updated);
      setServerMsg({ type: "success", text: "Client public key removed" });
      setTimeout(() => setServerMsg(null), 3000);
      loadServerStatus();
    } catch (err: any) {
      setServerMsg({ type: "error", text: `Failed to remove key: ${err?.message || err}` });
      setTimeout(() => setServerMsg(null), 4000);
    }
  };

  // ==================== Agent Functions ====================
  const loadAgentStatus = async () => {
    setAgentLoading(true);
    try {
      const status = await invoke<SshAgentStatus>("get_ssh_agent_status");
      setAgentStatus(status);
      const identities = await invoke<SshIdentity[]>("list_agent_identities");
      setAgentIdentities(identities);
    } catch (err) {
      console.error("Failed to load agent status:", err);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleAddKeyToAgent = async () => {
    if (!newKeyPath.trim()) return;
    try {
      const lifetime = keyLifetime === "unlimited" ? undefined : Number(keyLifetime);
      const res = await invoke<string>("add_key_to_agent", {
        keyPath: newKeyPath.trim(),
        lifetimeSecs: lifetime,
      });
      setAgentMsg({ type: "success", text: res });
      setTimeout(() => setAgentMsg(null), 3000);
      loadAgentStatus();
    } catch (err: any) {
      setAgentMsg({ type: "error", text: err?.message || String(err) });
      setTimeout(() => setAgentMsg(null), 4000);
    }
  };

  const handleRemoveKeyFromAgent = async (keyPath: string) => {
    try {
      await invoke("remove_key_from_agent", { keyPath });
      setAgentMsg({ type: "success", text: `Removed ${keyPath} from agent` });
      setTimeout(() => setAgentMsg(null), 3000);
      loadAgentStatus();
    } catch (err: any) {
      setAgentMsg({ type: "error", text: `Failed to remove key: ${err?.message || err}` });
      setTimeout(() => setAgentMsg(null), 4000);
    }
  };

  const handleClearAllAgentKeys = async () => {
    if (!confirmPurgeKeys) {
      setConfirmPurgeKeys(true);
      setTimeout(() => setConfirmPurgeKeys(false), 3500);
      return;
    }
    setConfirmPurgeKeys(false);
    try {
      await invoke("clear_all_agent_keys");
      setAgentMsg({ type: "success", text: "Purged all keys from ssh-agent" });
      setTimeout(() => setAgentMsg(null), 3000);
      loadAgentStatus();
    } catch (err: any) {
      setAgentMsg({ type: "error", text: `Failed to clear agent keys: ${err?.message || err}` });
      setTimeout(() => setAgentMsg(null), 4000);
    }
  };

  useEffect(() => {
    loadServerStatus();
    loadAgentStatus();
    const interval = setInterval(() => {
      loadServerStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const primaryIp = serverStatus?.lan_ips[0] || "127.0.0.1";
  const connectCommand = `ssh ${serverStatus?.username || "user"}@${primaryIp} -p ${serverStatus?.port || 2222}`;

  const copyConnectionCommand = () => {
    navigator.clipboard.writeText(connectCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#080c14",
        color: "#f1f5f9",
        overflowY: "auto",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 28px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "linear-gradient(to bottom, #0f1626, #090e19)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#22d3ee",
            }}
          >
            <Server size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
              SSH Server Hosting & SSH Agent Hub
            </h1>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Run an embedded macOS SSH server daemon and manage loaded credentials in $SSH_AUTH_SOCK
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div
          style={{
            display: "flex",
            background: "rgba(0, 0, 0, 0.3)",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            gap: "4px",
          }}
        >
          <button
            onClick={() => setActiveSubTab("server")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: activeSubTab === "server" ? "#06b6d4" : "transparent",
              color: activeSubTab === "server" ? "#080c14" : "#94a3b8",
            }}
          >
            <Server size={14} />
            <span>SSH Server Hosting</span>
            {serverStatus?.running && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  marginLeft: "4px",
                }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("agent")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: activeSubTab === "agent" ? "#06b6d4" : "transparent",
              color: activeSubTab === "agent" ? "#080c14" : "#94a3b8",
            }}
          >
            <Shield size={14} />
            <span>SSH Agent Hub</span>
            {agentIdentities.length > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 5px",
                  borderRadius: "10px",
                  background: activeSubTab === "agent" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)",
                  color: activeSubTab === "agent" ? "#080c14" : "#cbd5e1",
                  marginLeft: "4px",
                }}
              >
                {agentIdentities.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={{ padding: "24px 28px", maxWidth: "1000px", width: "100%" }}>
        {/* ========================================================= */}
        {/* SUBTAB 1: SSH SERVER HOSTING                              */}
        {/* ========================================================= */}
        {activeSubTab === "server" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Status Hero Card */}
            <div
              style={{
                backgroundColor: serverStatus?.running
                  ? "rgba(16, 185, 129, 0.05)"
                  : "rgba(255, 255, 255, 0.02)",
                border: serverStatus?.running
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                boxShadow: serverStatus?.running
                  ? "0 0 30px rgba(16, 185, 129, 0.1)"
                  : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: serverStatus?.running
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(255, 255, 255, 0.05)",
                    border: serverStatus?.running
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: serverStatus?.running ? "#10b981" : "#64748b",
                  }}
                >
                  <Server size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                      Embedded SSH Server Daemon
                    </h2>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor: serverStatus?.running
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.06)",
                        color: serverStatus?.running ? "#34d399" : "#94a3b8",
                        border: serverStatus?.running
                          ? "1px solid rgba(16, 185, 129, 0.4)"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      {serverStatus?.running ? "RUNNING" : "STOPPED"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    {serverStatus?.running
                      ? `Listening on ${serverStatus.listen_address}:${serverStatus.port} (PID: ${serverStatus.pid})`
                      : "Ready to accept incoming terminal sessions on unprivileged port"}
                  </p>
                </div>
              </div>

              {/* Start / Stop Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {serverStatus?.running ? (
                  <button
                    onClick={handleStopServer}
                    disabled={serverLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(244, 63, 94, 0.15)",
                      border: "1px solid rgba(244, 63, 94, 0.4)",
                      color: "#fda4af",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Square size={14} fill="#fda4af" />
                    <span>Stop Server</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartServer}
                    disabled={serverLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 20px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #10b981, #06b6d4)",
                      border: "none",
                      color: "#080c14",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)",
                    }}
                  >
                    <Play size={14} fill="#080c14" />
                    <span>Start SSH Server</span>
                  </button>
                )}

                {!serverStatus?.running && (
                  <button
                    onClick={handleAutoConfigureServer}
                    disabled={serverLoading || isAutoConfiguringServer}
                    title="Auto-probe open port (2222+), generate ED25519 host key, import client pubkeys, and start"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "rgba(168, 85, 247, 0.15)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      color: "#c084fc",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 0 12px rgba(168, 85, 247, 0.2)",
                    }}
                  >
                    <Zap size={14} />
                    <span>{isAutoConfiguringServer ? "Configuring..." : "⚡ 1-Click Auto-Configure"}</span>
                  </button>
                )}

                <button
                  onClick={loadServerStatus}
                  title="Refresh Status"
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Server Message Banner */}
            {serverMsg && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  backgroundColor:
                    serverMsg.type === "success"
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(244, 63, 94, 0.12)",
                  border:
                    serverMsg.type === "success"
                      ? "1px solid rgba(16, 185, 129, 0.3)"
                      : "1px solid rgba(244, 63, 94, 0.3)",
                  color: serverMsg.type === "success" ? "#34d399" : "#fda4af",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                {serverMsg.text}
              </div>
            )}

            {/* Quick Connect Command Card (When Running) */}
            {serverStatus?.running && (
              <div
                style={{
                  backgroundColor: "rgba(6, 182, 212, 0.05)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Terminal size={15} color="#22d3ee" />
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#22d3ee" }}>
                      Incoming Client Connection Command
                    </span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Run from any remote machine on the same LAN or VPN
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#050811",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    gap: "12px",
                  }}
                >
                  <code style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "#38bdf8" }}>
                    {connectCommand}
                  </code>
                  <button
                    onClick={copyConnectionCommand}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      background: "rgba(6, 182, 212, 0.15)",
                      border: "1px solid rgba(6, 182, 212, 0.3)",
                      color: "#22d3ee",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copiedCommand ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedCommand ? "Copied!" : "Copy Command"}</span>
                  </button>
                </div>

                {/* Available Network Interfaces */}
                {serverStatus.lan_ips.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                    <Network size={12} color="#64748b" />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Available IP addresses:</span>
                    {serverStatus.lan_ips.map((ip) => (
                      <span
                        key={ip}
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          color: "#cbd5e1",
                        }}
                      >
                        {ip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Server Settings Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              {/* Listener Configuration */}
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                  Listener Configuration
                </span>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    Server Port (Unprivileged &gt; 1024)
                  </label>
                  <input
                    type="number"
                    value={serverPort}
                    disabled={serverStatus?.running}
                    onChange={(e) => setServerPort(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: "#080c14",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    Listen Interface Address
                  </label>
                  <select
                    value={listenAddress}
                    disabled={serverStatus?.running}
                    onChange={(e) => setListenAddress(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: "#080c14",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    <option value="0.0.0.0">0.0.0.0 (All LAN & VPN Interfaces)</option>
                    <option value="127.0.0.1">127.0.0.1 (Localhost only)</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                    <input
                      type="checkbox"
                      checked={allowPubkey}
                      disabled={serverStatus?.running}
                      onChange={(e) => setAllowPubkey(e.target.checked)}
                      style={{ accentColor: "#06b6d4" }}
                    />
                    <span>Allow Public Key Authentication (Recommended)</span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                    <input
                      type="checkbox"
                      checked={allowPassword}
                      disabled={serverStatus?.running}
                      onChange={(e) => setAllowPassword(e.target.checked)}
                      style={{ accentColor: "#06b6d4" }}
                    />
                    <span>Allow Password Authentication</span>
                  </label>
                </div>
              </div>

              {/* Host Key Info */}
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                  Host Key Security
                </span>

                <div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Algorithm & Key Path</span>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#38bdf8", marginTop: "4px" }}>
                    ED25519 (~/.theia/ssh_server/ssh_host_ed25519_key)
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Host Key Fingerprint</span>
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#cbd5e1",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      marginTop: "4px",
                      wordBreak: "break-all",
                    }}
                  >
                    {serverStatus?.host_key_fingerprint || "Generating upon start..."}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "rgba(6, 182, 212, 0.04)",
                    border: "1px solid rgba(6, 182, 212, 0.15)",
                    borderRadius: "6px",
                    padding: "10px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    lineHeight: "1.4",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#22d3ee", marginBottom: "4px" }}>
                    <Info size={13} />
                    <strong>Isolated Daemon Sandbox:</strong>
                  </div>
                  This server runs isolated from macOS system remote login services with its own dedicated keys and authorized clients list.
                </div>
              </div>
            </div>

            {/* Authorized Keys Manager */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                    Authorized Public Keys ({authorizedKeys.length})
                  </h3>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Clients whose public keys appear below can authenticate via SSH key
                  </span>
                </div>

                <button
                  onClick={() => setShowAddKeyInput((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "rgba(6, 182, 212, 0.15)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    color: "#22d3ee",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} />
                  <span>Add Public Key</span>
                </button>
              </div>

              {/* Add key input box */}
              {showAddKeyInput && (
                <div
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... user@laptop"
                    value={newAuthKey}
                    onChange={(e) => setNewAuthKey(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "#080c14",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#38bdf8",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      onClick={() => setShowAddKeyInput(false)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "5px",
                        background: "transparent",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#94a3b8",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAuthorizedKey}
                      style={{
                        padding: "5px 14px",
                        borderRadius: "5px",
                        background: "#06b6d4",
                        border: "none",
                        color: "#080c14",
                        fontWeight: 700,
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Save Key
                    </button>
                  </div>
                </div>
              )}

              {authorizedKeys.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: "12px" }}>
                  No authorized public keys configured. Click "+ Add Public Key" to authorize clients.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {authorizedKeys.map((k, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        gap: "12px",
                      }}
                    >
                      <code
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "#cbd5e1",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {k}
                      </code>
                      <button
                        onClick={() => handleRemoveAuthorizedKey(k)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Server Logs */}
            {serverStatus?.log_tail && serverStatus.log_tail.length > 0 && (
              <div
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Activity size={14} color="#22d3ee" />
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "#f8fafc" }}>
                    Recent SSH Daemon Logs (~/.theia/ssh_server/sshd.log)
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "#050811",
                    borderRadius: "6px",
                    padding: "12px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "#94a3b8",
                    lineHeight: "1.5",
                    maxHeight: "160px",
                    overflowY: "auto",
                  }}
                >
                  {serverStatus.log_tail.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: SSH AGENT HUB                                   */}
        {/* ========================================================= */}
        {activeSubTab === "agent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Agent Status Hero */}
            <div
              style={{
                backgroundColor: agentStatus?.active
                  ? "rgba(6, 182, 212, 0.05)"
                  : "rgba(244, 63, 94, 0.05)",
                border: agentStatus?.active
                  ? "1px solid rgba(6, 182, 212, 0.3)"
                  : "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "12px",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: agentStatus?.active
                      ? "rgba(6, 182, 212, 0.15)"
                      : "rgba(244, 63, 94, 0.15)",
                    border: agentStatus?.active
                      ? "1px solid rgba(6, 182, 212, 0.4)"
                      : "1px solid rgba(244, 63, 94, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: agentStatus?.active ? "#22d3ee" : "#f43f5e",
                  }}
                >
                  <Shield size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                      macOS SSH Authentication Agent ($SSH_AUTH_SOCK)
                    </h2>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor: agentStatus?.active
                          ? "rgba(6, 182, 212, 0.2)"
                          : "rgba(244, 63, 94, 0.2)",
                        color: agentStatus?.active ? "#22d3ee" : "#fda4af",
                      }}
                    >
                      {agentStatus?.active ? "CONNECTED" : "INACTIVE"}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#94a3b8",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "500px",
                    }}
                  >
                    {agentStatus?.socket_path || "No agent socket detected"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={loadAgentStatus}
                  title="Refresh Agent Keys"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={13} className={agentLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleAutoConfigureAgent}
                  disabled={agentLoading || isAutoConfiguringAgent}
                  title="Detect/launch ssh-agent, export $SSH_AUTH_SOCK, scan ~/.ssh and vault, and load all keys"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                    border: "1px solid rgba(168, 85, 247, 0.4)",
                    color: "#c084fc",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 0 10px rgba(168, 85, 247, 0.2)",
                  }}
                >
                  <Zap size={13} />
                  <span>{isAutoConfiguringAgent ? "Configuring..." : "⚡ 1-Click Auto-Configure"}</span>
                </button>

                {agentIdentities.length > 0 && (
                  <button
                    onClick={handleClearAllAgentKeys}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(244, 63, 94, 0.1)",
                      border: "1px solid rgba(244, 63, 94, 0.3)",
                      color: "#fda4af",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Purge All Keys</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification message */}
            {agentMsg && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  backgroundColor:
                    agentMsg.type === "success"
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(244, 63, 94, 0.15)",
                  border:
                    agentMsg.type === "success"
                      ? "1px solid rgba(16, 185, 129, 0.3)"
                      : "1px solid rgba(244, 63, 94, 0.3)",
                  color: agentMsg.type === "success" ? "#34d399" : "#fda4af",
                }}
              >
                {agentMsg.text}
              </div>
            )}

            {/* Add Key to Agent Form Card */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "18px 20px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px 0", color: "#f8fafc" }}>
                Add SSH Key to Agent (ssh-add)
              </h3>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    Private Key Path
                  </label>
                  <input
                    type="text"
                    value={newKeyPath}
                    onChange={(e) => setNewKeyPath(e.target.value)}
                    placeholder="~/.ssh/id_ed25519"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: "#080c14",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ width: "160px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                    Lifetime Expiration
                  </label>
                  <select
                    value={String(keyLifetime)}
                    onChange={(e) =>
                      setKeyLifetime(
                        e.target.value === "unlimited" ? "unlimited" : Number(e.target.value)
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      background: "#080c14",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    <option value="unlimited">Unlimited (Default)</option>
                    <option value="3600">1 Hour</option>
                    <option value="14400">4 Hours</option>
                    <option value="28800">8 Hours</option>
                  </select>
                </div>

                <button
                  onClick={handleAddKeyToAgent}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 18px",
                    borderRadius: "6px",
                    background: "#06b6d4",
                    border: "none",
                    color: "#080c14",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  <span>Add to Agent</span>
                </button>
              </div>
            </div>

            {/* Loaded Identities List */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                  Loaded Key Identities in Memory ({agentIdentities.length})
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Queried via ssh-add -l
                </span>
              </div>

              {agentIdentities.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "13px" }}>
                  No identities currently loaded in ssh-agent. Add a key above to enable agent-based authentication.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {agentIdentities.map((id, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor:
                              id.algorithm === "ED25519"
                                ? "rgba(6, 182, 212, 0.15)"
                                : "rgba(168, 85, 247, 0.15)",
                            color: id.algorithm === "ED25519" ? "#22d3ee" : "#c084fc",
                            border:
                              id.algorithm === "ED25519"
                                ? "1px solid rgba(6, 182, 212, 0.3)"
                                : "1px solid rgba(168, 85, 247, 0.3)",
                          }}
                        >
                          {id.algorithm} {id.bits ? `(${id.bits})` : ""}
                        </span>

                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                            {id.comment || "Unnamed Identity"}
                          </span>
                          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#64748b" }}>
                            {id.fingerprint}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveKeyFromAgent(id.comment)}
                        title="Remove from Agent"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: "6px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Forwarding Tip Banner */}
            <div
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.05)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <Info size={18} color="#c084fc" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "13px", color: "#d8b4fe" }}>
                  SSH Agent Forwarding (ssh -A):
                </strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                  Keys loaded in Theia's SSH Agent Hub are automatically leveraged for public-key authentication.
                  When you connect to remote bastion servers, agent forwarding allows the remote server to securely authenticate against internal git repositories or downstream servers without storing private keys remotely.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

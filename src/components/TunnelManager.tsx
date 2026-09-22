import React, { useState, useEffect } from "react";
import {
  Network,
  Plus,
  Play,
  Square,
  Trash2,
  ArrowRight,
  Activity,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { TunnelConfig } from "../types";

export const TunnelManager: React.FC = () => {
  const [tunnels, setTunnels] = useState<TunnelConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTunnel, setNewTunnel] = useState<Partial<TunnelConfig>>({
    tunnel_type: "local",
    local_port: 8080,
    remote_host: "127.0.0.1",
    remote_port: 80,
  });

  const loadTunnels = async () => {
    try {
      const list = await invoke<TunnelConfig[]>("list_tunnels");
      setTunnels(list);
    } catch (_) {
      // Fallback default demo tunnels
      setTunnels([
        {
          id: "tun_pg",
          host_id: "",
          tunnel_type: "local",
          local_port: 5433,
          remote_host: "127.0.0.1",
          remote_port: 5432,
          enabled: true,
          status: "running",
          bytes_transferred: 1420580,
        },
        {
          id: "tun_redis",
          host_id: "",
          tunnel_type: "local",
          local_port: 6380,
          remote_host: "127.0.0.1",
          remote_port: 6379,
          enabled: false,
          status: "stopped",
          bytes_transferred: 0,
        },
        {
          id: "tun_socks",
          host_id: "",
          tunnel_type: "dynamic",
          local_port: 1080,
          enabled: false,
          status: "stopped",
          bytes_transferred: 0,
        },
      ]);
    }
  };

  useEffect(() => {
    loadTunnels();
  }, []);

  const handleToggle = async (tunnelId: string) => {
    try {
      await invoke("toggle_tunnel", { tunnelId });
      loadTunnels();
    } catch (_) {
      // Toggle locally for demo
      setTunnels((prev) =>
        prev.map((t) =>
          t.id === tunnelId
            ? {
                ...t,
                status: t.status === "running" ? "stopped" : "running",
                enabled: t.status !== "running",
              }
            : t
        )
      );
    }
  };

  const handleAddTunnel = async () => {
    const config: TunnelConfig = {
      id: `tun_${Date.now()}`,
      host_id: "",
      tunnel_type: (newTunnel.tunnel_type as any) || "local",
      local_port: Number(newTunnel.local_port) || 8080,
      remote_host: newTunnel.remote_host || "127.0.0.1",
      remote_port: Number(newTunnel.remote_port) || 80,
      enabled: false,
      status: "stopped",
      bytes_transferred: 0,
    };

    try {
      await invoke("save_tunnel", { tunnel: config });
      setShowAddModal(false);
      loadTunnels();
    } catch (_) {
      setTunnels((prev) => [config, ...prev]);
      setShowAddModal(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete_tunnel", { id });
      loadTunnels();
    } catch (_) {
      setTunnels((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "24px 32px",
        background: "#080c14",
        color: "#f1f5f9",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Network size={22} color="#f59e0b" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc" }}>
              Visual Port Forwarding & Tunnels
            </h2>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontWeight: 600,
              }}
            >
              PRO UNLOCKED (FREE)
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            Route database connections, microservices, and web traffic securely through encrypted SSH tunnels.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            background: "#f59e0b",
            border: "none",
            color: "#080c14",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          <span>New Tunnel</span>
        </button>
      </div>

      {/* Tunnel Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
        {tunnels.map((t) => {
          const isRunning = t.status === "running";
          return (
            <div
              key={t.id}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: isRunning
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.07)",
                borderRadius: "12px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                position: "relative",
                transition: "all 0.15s ease",
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background:
                        t.tunnel_type === "local"
                          ? "rgba(6, 182, 212, 0.2)"
                          : t.tunnel_type === "remote"
                          ? "rgba(139, 92, 246, 0.2)"
                          : "rgba(245, 158, 11, 0.2)",
                      color:
                        t.tunnel_type === "local"
                          ? "#22d3ee"
                          : t.tunnel_type === "remote"
                          ? "#c084fc"
                          : "#fbbf24",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.tunnel_type}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                    Port {t.local_port}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Status Indicator */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: isRunning ? "#10b981" : "#64748b",
                        boxShadow: isRunning ? "0 0 10px #10b981" : "none",
                      }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: 600, color: isRunning ? "#34d399" : "#64748b" }}>
                      {isRunning ? "Running" : "Stopped"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Diagram / Routing Line */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", fontSize: "10px", display: "block" }}>LOCAL LISTEN</span>
                  <span style={{ color: "#22d3ee" }}>127.0.0.1:{t.local_port}</span>
                </div>

                <ArrowRight size={14} color="#64748b" />

                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#64748b", fontSize: "10px", display: "block" }}>REMOTE TARGET</span>
                  <span style={{ color: "#34d399" }}>
                    {t.tunnel_type === "dynamic" ? "SOCKS5 Proxy" : `${t.remote_host}:${t.remote_port}`}
                  </span>
                </div>
              </div>

              {/* Bottom stats and toggle button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                  <Activity size={12} />
                  <span>Traffic: {formatBytes(t.bytes_transferred)}</span>
                </div>

                <button
                  onClick={() => handleToggle(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    background: isRunning ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    border: isRunning ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                    color: isRunning ? "#fb7185" : "#34d399",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isRunning ? <Square size={12} /> : <Play size={12} />}
                  <span>{isRunning ? "Stop Tunnel" : "Start Tunnel"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Tunnel Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "#0d131f",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: "#f8fafc" }}>
              Configure SSH Port Forwarding Tunnel
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
              <div>
                <label style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Tunnel Mode</label>
                <select
                  value={newTunnel.tunnel_type}
                  onChange={(e) => setNewTunnel({ ...newTunnel, tunnel_type: e.target.value as any })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#fff",
                    outline: "none",
                  }}
                >
                  <option value="local">Local (-L): Forward local port to remote</option>
                  <option value="remote">Remote (-R): Forward remote port to local</option>
                  <option value="dynamic">Dynamic (-D): SOCKS5 Proxy</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Local Listening Port</label>
                <input
                  type="number"
                  value={newTunnel.local_port}
                  onChange={(e) => setNewTunnel({ ...newTunnel, local_port: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              {newTunnel.tunnel_type !== "dynamic" && (
                <>
                  <div>
                    <label style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Destination Host</label>
                    <input
                      type="text"
                      placeholder="127.0.0.1 or remote.db.internal"
                      value={newTunnel.remote_host}
                      onChange={(e) => setNewTunnel({ ...newTunnel, remote_host: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Destination Port</label>
                    <input
                      type="number"
                      value={newTunnel.remote_port}
                      onChange={(e) => setNewTunnel({ ...newTunnel, remote_port: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        padding: "8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        outline: "none",
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTunnel}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  background: "#f59e0b",
                  border: "none",
                  color: "#080c14",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Create Tunnel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

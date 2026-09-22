import React, { useState, useEffect } from "react";
import {
  Server,
  X,
  KeyRound,
  Lock,
  ArrowRight,
  Route,
} from "lucide-react";
import { HostConfig } from "../types";

interface HostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (host: HostConfig, connectImmediately: boolean) => void;
  existingHost?: HostConfig | null;
  allHosts: HostConfig[];
}

export const HostModal: React.FC<HostModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingHost,
  allHosts,
}) => {
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState(22);
  const [user, setUser] = useState("root");
  const [authType, setAuthType] = useState<"key" | "password">("key");
  const [identityFile, setIdentityFile] = useState("~/.ssh/id_ed25519");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState("Production");
  const [tags, setTags] = useState("");
  const [bastionId, setBastionId] = useState<string>("");

  useEffect(() => {
    if (existingHost) {
      setName(existingHost.name);
      setHostname(existingHost.hostname);
      setPort(existingHost.port);
      setUser(existingHost.user || "root");
      setIdentityFile(existingHost.identity_file || "~/.ssh/id_ed25519");
      setPassword(existingHost.password || "");
      setAuthType(existingHost.password ? "password" : "key");
      setGroup(existingHost.group || "Production");
      setTags(existingHost.tags.join(", "));
      setBastionId(existingHost.bastion_id || "");
    } else {
      setName("");
      setHostname("");
      setPort(22);
      setUser("root");
      setAuthType("key");
      setIdentityFile("~/.ssh/id_ed25519");
      setPassword("");
      setGroup("Production");
      setTags("");
      setBastionId("");
    }
  }, [existingHost, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (connectImmediately: boolean) => {
    if (!name.trim() || !hostname.trim()) return;

    const host: HostConfig = {
      id: existingHost ? existingHost.id : `host_${Date.now()}`,
      name: name.trim(),
      hostname: hostname.trim(),
      port: Number(port) || 22,
      user: user.trim() || undefined,
      identity_file: authType === "key" ? identityFile.trim() || undefined : undefined,
      password: authType === "password" ? password : undefined,
      group: group.trim() || "Default",
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      bastion_id: bastionId || undefined,
      source: existingHost ? existingHost.source : "bookmark",
    };

    onSave(host, connectImmediately);
  };

  // Filter available bastions (cannot jump through itself)
  const availableBastions = allHosts.filter((h) => !existingHost || h.id !== existingHost.id);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: "#0d1424",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "12px",
          width: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#06b6d4",
              }}
            >
              <Server size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                {existingHost ? "Edit Host Bookmark" : "Add New SSH Host"}
              </h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Enterprise connection manager & bastion multi-hop routing
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Friendly Name */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
              Bookmark Label
            </label>
            <input
              type="text"
              placeholder="e.g. US-East Primary Database"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          </div>

          {/* Hostname & Port */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Hostname or IP Address
              </label>
              <input
                type="text"
                placeholder="192.168.1.50 or db.company.internal"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#060911",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                style={{
                  width: "100%",
                  backgroundColor: "#060911",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="root or ubuntu or ec2-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
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
          </div>

          {/* Authentication Selector */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
              Authentication Method
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => setAuthType("key")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border:
                    authType === "key"
                      ? "1px solid #06b6d4"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor:
                    authType === "key" ? "rgba(6, 182, 212, 0.15)" : "#060911",
                  color: authType === "key" ? "#22d3ee" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <KeyRound size={14} /> SSH Key Identity
              </button>

              <button
                type="button"
                onClick={() => setAuthType("password")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border:
                    authType === "password"
                      ? "1px solid #06b6d4"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor:
                    authType === "password" ? "rgba(6, 182, 212, 0.15)" : "#060911",
                  color: authType === "password" ? "#22d3ee" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                <Lock size={14} /> Password
              </button>
            </div>

            {authType === "key" ? (
              <div>
                <input
                  type="text"
                  placeholder="~/.ssh/id_ed25519"
                  value={identityFile}
                  onChange={(e) => setIdentityFile(e.target.value)}
                  style={{
                    width: "100%",
                    backgroundColor: "#060911",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    fontFamily: "'JetBrains Mono', monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ) : (
              <div>
                <input
                  type="password"
                  placeholder="Enter SSH password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              </div>
            )}
          </div>

          {/* Group & Tags */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Group Folder
              </label>
              <input
                type="text"
                placeholder="e.g. Production, Staging"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
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
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="k8s, redis, prod"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
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
            </div>
          </div>

          {/* Bastion / Jump Host Selector */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <Route size={14} color="#06b6d4" /> Jump Host / Bastion Proxy (ProxyJump)
              </label>
              <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "500" }}>Unlocked</span>
            </div>
            <select
              value={bastionId}
              onChange={(e) => setBastionId(e.target.value)}
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
                cursor: "pointer",
              }}
            >
              <option value="">Direct Connection (No Bastion)</option>
              {availableBastions.map((b) => (
                <option key={b.id} value={b.id}>
                  Jump via {b.name} ({b.user ? `${b.user}@` : ""}{b.hostname})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            type="button"
            onClick={() => handleSubmit(false)}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              color: "#f8fafc",
              cursor: "pointer",
            }}
          >
            Save Bookmark
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#06b6d4",
              border: "none",
              borderRadius: "6px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: "500",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.35)",
            }}
          >
            Connect <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

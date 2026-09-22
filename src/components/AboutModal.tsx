import React from "react";
import {
  X,
  ShieldCheck,
  Terminal,
  Cpu,
  KeyRound,
  Zap,
  Lock,
  Flame,
  Radio,
  FolderGit2,
  Fingerprint,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheatSheet?: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onOpenCheatSheet,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(3, 7, 18, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "88vh",
          backgroundColor: "#0d1322",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(6, 182, 212, 0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "linear-gradient(to right, rgba(6, 182, 212, 0.1), rgba(147, 51, 234, 0.08), transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/theia-icon.png"
              alt="Theia Logo"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                boxShadow: "0 0 16px rgba(6, 182, 212, 0.4)",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  Theia SSH
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: "rgba(6, 182, 212, 0.15)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                    color: "#22d3ee",
                  }}
                >
                  v0.1.0 • FOSS
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                High-Performance macOS Terminal & SSH Workbench
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#cbd5e1",
          }}
        >
          {/* The Manifesto Banner */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Flame size={16} color="#f87171" />
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#fca5a5", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Why Theia Was Built: The Anti-Freemium Manifesto
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12.5px", color: "#e2e8f0" }}>
              We got fed up with the modern Mac App Store terminal landscape. Greedy SaaS startups took a fundamental Unix protocol created decades ago and turned it into a predatory subscription model—charging <strong>$10 to $20 a month</strong> just to save port forwards, sync snippets, or keep more than two tabs open. They force you into proprietary cloud accounts, exfiltrate private connection metadata, and bundle bloated telemetry daemons that chew through battery and RAM.
            </p>
            <p style={{ margin: 0, marginTop: "8px", fontSize: "12.5px", color: "#e2e8f0" }}>
              <strong>Theia is our answer:</strong> A 100% Free and Open-Source (FOSS) terminal workbench engineered in Rust and WebGL. No subscriptions. No artificial limits. No paywalled tabs. Zero tracking. Your keys and sessions remain yours alone, protected by local hardware biometrics.
            </p>
          </div>

          {/* Core Pillars Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Lock size={15} color="#34d399" />
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>Zero Cloud, Zero Telemetry</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Everything lives locally in <code style={{ color: "#22d3ee" }}>~/.theia/</code>. No analytics pings, no cloud login required, and zero network calls to third parties.
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Fingerprint size={15} color="#38bdf8" />
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>FIDO2 Passkeys & Biometrics</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Native support for Yubico YubiKey and Apple Touch ID (Secure Enclave) hardware-bound keys using modern <code style={{ color: "#22d3ee" }}>ed25519-sk</code>.
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Cpu size={15} color="#a855f7" />
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>Rust & WebGL Acceleration</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Tauri v2 + GPU-accelerated WebGL terminal rendering for ultra-low latency, sub-millisecond redraws, and minimal memory footprint.
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Zap size={15} color="#fbbf24" />
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>1-Click Server & Agent</span>
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Automatic local SSH server daemon hosting and seamless SSH agent socket configuration with zero terminal gymnastics.
              </div>
            </div>
          </div>

          {/* Built-in Powerhouse Features */}
          <div>
            <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px 0" }}>
              Every Pro Feature Unlocked For Everyone
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <Terminal size={13} color="#22d3ee" /> Split Panes & Grid 2x2
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <Radio size={13} color="#f43f5e" /> Multi-Session Broadcast
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <FolderGit2 size={13} color="#10b981" /> Dual-Pane SFTP Explorer
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <KeyRound size={13} color="#eab308" /> AES-256-GCM Key Vault
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <Zap size={13} color="#ec4899" /> High-Density Snippets
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1" }}>
                <ShieldCheck size={13} color="#6366f1" /> Port Forward Tunnels
              </div>
            </div>
          </div>

          {/* Tech Stack Specs */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              fontSize: "11.5px",
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Engine: <strong>Rust 2021 + Tauri v2 + xterm WebGL</strong></span>
            <span>Target: <strong>macOS arm64 & x86_64</strong></span>
            <span>License: <strong>MIT (Free Forever)</strong></span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(8, 12, 20, 0.8)",
          }}
        >
          {onOpenCheatSheet ? (
            <button
              onClick={() => {
                onClose();
                onOpenCheatSheet();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#22d3ee",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: 0,
              }}
            >
              <span>View Keyboard Shortcuts (⌘/)</span>
            </button>
          ) : (
            <div style={{ fontSize: "11px", color: "#64748b" }}>Built with craftsmanship & care</div>
          )}

          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              color: "#22d3ee",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(6, 182, 212, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(6, 182, 212, 0.15)";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

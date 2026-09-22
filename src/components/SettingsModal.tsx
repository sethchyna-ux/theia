import React from "react";
import {
  X,
  Sliders,
  Type,
  Eye,
  KeyRound,
  Compass,
  Check,
} from "lucide-react";
import {
  MONOSPACE_FONTS,
  setStoredFontId,
  setStoredFontSize,
  setStoredVibrancy,
} from "../fonts";
import { invoke } from "@tauri-apps/api/core";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFontId: string;
  onFontChange: (fontId: string) => void;
  currentFontSize: number;
  onFontSizeChange: (size: number) => void;
  vibrancyEnabled: boolean;
  onVibrancyChange: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentFontId,
  onFontChange,
  currentFontSize,
  onFontSizeChange,
  vibrancyEnabled,
  onVibrancyChange,
}) => {
  if (!isOpen) return null;

  const handleSelectFont = (fontId: string) => {
    setStoredFontId(fontId);
    onFontChange(fontId);
  };

  const handleFontSize = (delta: number) => {
    const next = Math.max(10, Math.min(24, currentFontSize + delta));
    setStoredFontSize(next);
    onFontSizeChange(next);
  };

  const handleToggleVibrancy = async (enabled: boolean) => {
    setStoredVibrancy(enabled);
    onVibrancyChange(enabled);
    try {
      await invoke("set_window_vibrancy", { enabled });
    } catch (err) {
      console.warn("Failed to set window vibrancy:", err);
    }
  };

  const selectedFont =
    MONOSPACE_FONTS.find((f) => f.id === currentFontId) || MONOSPACE_FONTS[0];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(13, 17, 23, 0.94)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: "14px",
          width: "620px",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "24px 28px",
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.8)",
          color: "#f8fafc",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9px",
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22d3ee",
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "600", margin: 0 }}>
                macOS Preferences
              </h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Typography, native window effects, and security services
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Section 1: Monospace Fonts */}
        <div style={{ marginBottom: "26px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <label
              style={{
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#e2e8f0",
              }}
            >
              <Type size={16} color="#06b6d4" /> Terminal Monospace Font
            </label>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Active: {selectedFont.name}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            {MONOSPACE_FONTS.map((font) => {
              const isSelected = font.id === currentFontId;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectFont(font.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "1px solid #06b6d4"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    backgroundColor: isSelected
                      ? "rgba(6, 182, 212, 0.12)"
                      : "rgba(255, 255, 255, 0.03)",
                    color: isSelected ? "#38bdf8" : "#cbd5e1",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: font.fontFamily,
                        fontSize: "13px",
                        fontWeight: "600",
                        marginBottom: "2px",
                      }}
                    >
                      {font.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {font.description}
                    </div>
                  </div>
                  {isSelected && <Check size={16} color="#06b6d4" />}
                </button>
              );
            })}
          </div>

          {/* Font Size & Live Sample Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Font Size:{" "}
              <strong style={{ color: "#f8fafc" }}>{currentFontSize}px</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => handleFontSize(-1)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  borderRadius: "5px",
                  padding: "4px 10px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleFontSize(1)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  borderRadius: "5px",
                  padding: "4px 10px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Live Code Preview */}
          <div
            style={{
              backgroundColor: "#050810",
              border: "1px solid rgba(255, 255, 255, 0.07)",
              borderRadius: "8px",
              padding: "12px 16px",
              fontFamily: selectedFont.fontFamily,
              fontSize: `${currentFontSize}px`,
              lineHeight: "1.6",
              color: "#38bdf8",
            }}
          >
            <span style={{ color: "#a855f7" }}>ssh</span>{" "}
            <span style={{ color: "#22c55e" }}>deploy@cloud.prod.internal</span>{" "}
            <span style={{ color: "#94a3b8" }}>-p 22</span>
            <div style={{ color: "#64748b", fontSize: "11px" }}>
              # 0ms latency • macOS 24-bit truecolor • Sub-millisecond PTY
            </div>
          </div>
        </div>

        {/* Section 2: Native Window Vibrancy */}
        <div
          style={{
            marginBottom: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#e2e8f0",
                  marginBottom: "4px",
                }}
              >
                <Eye size={16} color="#06b6d4" /> macOS Native Window Vibrancy
              </label>
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  maxWidth: "430px",
                }}
              >
                Render hardware-accelerated translucent acrylic blur behind
                the terminal viewport using NSVisualEffectMaterial.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVibrancy(!vibrancyEnabled)}
              style={{
                width: "48px",
                height: "26px",
                borderRadius: "13px",
                border: "none",
                backgroundColor: vibrancyEnabled
                  ? "#06b6d4"
                  : "rgba(255, 255, 255, 0.18)",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "3px",
                  left: vibrancyEnabled ? "25px" : "3px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  transition: "left 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>
        </div>

        {/* Section 3: Apple Keychain & System Tray Info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "18px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#38bdf8",
                marginBottom: "6px",
              }}
            >
              <KeyRound size={15} /> Apple Keychain Services
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                lineHeight: "1.4",
              }}
            >
              Encrypted credentials are saved under{" "}
              <code style={{ color: "#e2e8f0" }}>com.theia.ssh</code> inside
              macOS Keychain Access.
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#38bdf8",
                marginBottom: "6px",
              }}
            >
              <Compass size={15} /> Menu Bar Quick-Connect
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                lineHeight: "1.4",
              }}
            >
              Access bookmarks and spawn new local zsh terminals directly
              from the macOS top status bar.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#06b6d4",
              border: "none",
              borderRadius: "6px",
              padding: "8px 22px",
              fontSize: "13px",
              fontWeight: "500",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

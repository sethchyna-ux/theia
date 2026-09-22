import React, { useEffect, useRef } from "react";
import {
  Copy,
  ClipboardPaste,
  FileCode,
  Download,
  Search,
  FileDown,
  Trash2,
} from "lucide-react";

export interface ContextMenuProps {
  x: number;
  y: number;
  selectedText: string;
  detectedPath?: string | null;
  onCopy: () => void;
  onPaste: () => void;
  onOpenPathInEditor?: (path: string) => void;
  onDownloadPath?: (path: string) => void;
  onOpenSearch: () => void;
  onExportLog: () => void;
  onClearBuffer: () => void;
  onClose: () => void;
}

export const TerminalContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  selectedText,
  detectedPath,
  onCopy,
  onPaste,
  onOpenPathInEditor,
  onDownloadPath,
  onOpenSearch,
  onExportLog,
  onClearBuffer,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Esc
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Prevent menu going offscreen
  const menuWidth = 230;
  const menuHeight = detectedPath ? 240 : 180;
  const left = Math.min(x, window.innerWidth - menuWidth - 10);
  const top = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${menuWidth}px`,
        backgroundColor: "rgba(13, 17, 23, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "10px",
        padding: "6px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.65)",
        zIndex: 10000,
        color: "#e2e8f0",
        fontSize: "12px",
        userSelect: "none",
      }}
    >
      {/* Copy / Paste */}
      <button
        type="button"
        disabled={!selectedText}
        onClick={() => {
          onCopy();
          onClose();
        }}
        style={itemStyle(!selectedText)}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Copy size={13} color="#94a3b8" /> Copy
        </span>
        <span style={{ fontSize: "10px", color: "#64748b" }}>⌘C</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onPaste();
          onClose();
        }}
        style={itemStyle()}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ClipboardPaste size={13} color="#94a3b8" /> Paste
        </span>
        <span style={{ fontSize: "10px", color: "#64748b" }}>⌘V</span>
      </button>

      {/* Path Actions */}
      {detectedPath && (
        <>
          <div style={separatorStyle} />
          <div
            style={{
              padding: "4px 8px",
              fontSize: "10px",
              color: "#38bdf8",
              fontFamily: "'JetBrains Mono', monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Path: {detectedPath}
          </div>

          {onOpenPathInEditor && (
            <button
              type="button"
              onClick={() => {
                onOpenPathInEditor(detectedPath);
                onClose();
              }}
              style={itemStyle()}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileCode size={13} color="#06b6d4" /> Open in Remote Editor
              </span>
            </button>
          )}

          {onDownloadPath && (
            <button
              type="button"
              onClick={() => {
                onDownloadPath(detectedPath);
                onClose();
              }}
              style={itemStyle()}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Download size={13} color="#10b981" /> Download via SFTP
              </span>
            </button>
          )}
        </>
      )}

      <div style={separatorStyle} />

      {/* Utilities */}
      <button
        type="button"
        onClick={() => {
          onOpenSearch();
          onClose();
        }}
        style={itemStyle()}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Search size={13} color="#94a3b8" /> Find in Buffer
        </span>
        <span style={{ fontSize: "10px", color: "#64748b" }}>⌘F</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onExportLog();
          onClose();
        }}
        style={itemStyle()}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileDown size={13} color="#94a3b8" /> Export Session Log
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          onClearBuffer();
          onClose();
        }}
        style={itemStyle()}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Trash2 size={13} color="#f43f5e" /> Clear Buffer
        </span>
        <span style={{ fontSize: "10px", color: "#64748b" }}>⌘K</span>
      </button>
    </div>
  );
};

const itemStyle = (disabled = false): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "7px 10px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: "transparent",
  color: disabled ? "#475569" : "#f1f5f9",
  fontSize: "12px",
  cursor: disabled ? "not-allowed" : "pointer",
  textAlign: "left",
  transition: "background-color 0.1s ease",
});

const separatorStyle: React.CSSProperties = {
  height: "1px",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  margin: "4px 0",
};

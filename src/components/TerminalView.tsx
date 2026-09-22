import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HostConfig } from "../types";
import { TERMINAL_THEMES } from "../themes";
import { Search, ChevronDown, ChevronUp, X, ZoomIn, ZoomOut, Terminal as TermIcon, Download } from "lucide-react";
import { TerminalContextMenu } from "./TerminalContextMenu";

interface TerminalViewProps {
  sessionId: string;
  host: HostConfig;
  isActive: boolean;
  themeId?: string;
  fontFamily?: string;
  customFontSize?: number;
  onFocus?: () => void;
  broadcastMode?: boolean;
  onBroadcastInput?: (data: string) => void;
  onOpenPathInEditor?: (path: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  sessionId,
  host,
  isActive,
  themeId,
  fontFamily,
  customFontSize,
  onFocus,
  broadcastMode,
  onBroadcastInput,
  onOpenPathInEditor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fontSize, setFontSize] = useState(13);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    selectedText: string;
    detectedPath: string | null;
  } | null>(null);

  // Command duration tracker for background notifications
  const lastCommandStartTimeRef = useRef<number | null>(null);
  const isCommandRunningRef = useRef<boolean>(false);

  const isLocal = host.source === "local" || host.id.startsWith("local_");

  useEffect(() => {
    if (!containerRef.current) return;

    const currentTheme = TERMINAL_THEMES[themeId || "obsidian"] || TERMINAL_THEMES.obsidian;

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: customFontSize || fontSize,
      fontFamily: fontFamily || '"SF Mono", Menlo, monospace',
      theme: currentTheme,
      allowTransparency: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const cols = term.cols || 80;
    const rows = term.rows || 24;

    if (isLocal) {
      term.writeln(`\x1b[1;32m[Theia]\x1b[0m Spawning macOS PTY (\x1b[1;36mzsh\x1b[0m) ...\r\n`);
      invoke("local_terminal_spawn", {
        sessionId,
        cols,
        rows,
      }).catch((err) => {
        term.writeln(`\r\n\x1b[1;31m[Theia] Failed to spawn local shell: ${err}\x1b[0m\r\n`);
      });
    } else {
      term.writeln(
        `\x1b[1;36m[Theia SSH]\x1b[0m Connecting to \x1b[1m${host.user || "root"}@${host.hostname}:${host.port}\x1b[0m ...`
      );

      invoke("ssh_connect", {
        sessionId,
        host,
        cols,
        rows,
      })
        .then(() => {
          term.writeln(`\x1b[1;32m[Theia SSH] Connected.\x1b[0m\r\n`);
        })
        .catch((err) => {
          term.writeln(`\r\n\x1b[1;31m[Theia SSH] Connection failed: ${err}\x1b[0m\r\n`);
        });
    }

    // Listen to incoming data from backend
    const unlistenDataPromise = listen<string>(`ssh-data-${sessionId}`, (event) => {
      const payload = event.payload;
      term.write(payload);

      // Check if a background command finished
      if (isCommandRunningRef.current && lastCommandStartTimeRef.current) {
        const elapsed = Date.now() - lastCommandStartTimeRef.current;
        if (
          elapsed >= 4000 &&
          (payload.includes("$ ") ||
            payload.includes("# ") ||
            payload.includes("% ") ||
            payload.includes("❯ ") ||
            payload.includes("> "))
        ) {
          isCommandRunningRef.current = false;
          if (document.hidden || !isActive) {
            invoke("send_native_notification", {
              title: "Command Completed",
              message: `Task in '${host.name}' finished in ${Math.round(elapsed / 1000)}s`,
              bounceDock: true,
            }).catch(() => {});
          }
        }
      }
    });

    const unlistenClosePromise = listen<number>(`ssh-close-${sessionId}`, (event) => {
      term.writeln(`\r\n\x1b[1;33m[Theia] Session closed (code: ${event.payload})\x1b[0m`);
    });

    // Send user input to backend
    term.onData((data) => {
      if (data.includes("\r") || data.includes("\n")) {
        lastCommandStartTimeRef.current = Date.now();
        isCommandRunningRef.current = true;
      }
      if (broadcastMode && onBroadcastInput) {
        onBroadcastInput(data);
      } else {
        invoke("ssh_send_data", { sessionId, data }).catch(() => {});
      }
    });

    // Handle terminal resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (term.cols && term.rows) {
          invoke("ssh_resize", { sessionId, cols: term.cols, rows: term.rows }).catch(() => {});
        }
      } catch (_) {}
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // Keyboard shortcuts inside terminal: Cmd+F for search, Cmd+K for clear
    term.attachCustomKeyEventHandler((e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        setShowSearch((prev) => !prev);
        return false;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        term.clear();
        return false;
      }
      return true;
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      unlistenDataPromise.then((unlisten) => unlisten());
      unlistenClosePromise.then((unlisten) => unlisten());
      term.dispose();
      invoke("ssh_disconnect", { sessionId }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    if (termRef.current) {
      if (themeId && TERMINAL_THEMES[themeId]) {
        termRef.current.options.theme = TERMINAL_THEMES[themeId];
      }
      if (fontFamily) {
        termRef.current.options.fontFamily = fontFamily;
      }
      if (customFontSize) {
        termRef.current.options.fontSize = customFontSize;
        setFontSize(customFontSize);
      }
      fitAddonRef.current?.fit();
    }
  }, [themeId, fontFamily, customFontSize]);

  // Update font size
  const handleZoom = (delta: number) => {
    const newSize = Math.min(24, Math.max(9, fontSize + delta));
    setFontSize(newSize);
    if (termRef.current && fitAddonRef.current) {
      termRef.current.options.fontSize = newSize;
      fitAddonRef.current.fit();
      if (termRef.current.cols && termRef.current.rows) {
        invoke("ssh_resize", {
          sessionId,
          cols: termRef.current.cols,
          rows: termRef.current.rows,
        }).catch(() => {});
      }
    }
  };

  // Search logic
  const handleSearchNext = () => {
    if (searchAddonRef.current && searchQuery) {
      searchAddonRef.current.findNext(searchQuery);
    }
  };

  const handleSearchPrev = () => {
    if (searchAddonRef.current && searchQuery) {
      searchAddonRef.current.findPrevious(searchQuery);
    }
  };

  const extractPath = (text: string): string | null => {
    if (!text) return null;
    const trimmed = text.trim();
    const pathRegex = /(?:~?\/|\.\/)?(?:[\w\.\-]+\/)*[\w\.\-]+(?:\.[\w]+)?/;
    const match = trimmed.match(pathRegex);
    if (match && match[0] && (match[0].includes("/") || match[0].includes("."))) {
      return match[0];
    }
    return null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = termRef.current?.getSelection() || "";
    const path = extractPath(selection);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      selectedText: selection,
      detectedPath: path,
    });
  };

  const handleCopy = () => {
    const selection = termRef.current?.getSelection() || "";
    if (selection) {
      navigator.clipboard.writeText(selection);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        invoke("ssh_send_data", { sessionId, data: text }).catch(() => {});
      }
    } catch (err) {
      console.error("Paste failed:", err);
    }
  };

  const handleClearBuffer = () => {
    termRef.current?.clear();
  };

  const handleDownloadPath = async (remotePath: string) => {
    try {
      const data = await invoke<number[]>("sftp_read", {
        sessionId,
        path: remotePath,
      });
      const bytes = new Uint8Array(data);
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = remotePath.split("/").pop() || "downloaded_file";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SFTP download failed:", err);
    }
  };

  // Export scrollback buffer as .log file
  const handleExportLog = () => {
    if (!termRef.current) return;
    const term = termRef.current;
    const buffer = term.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    const logText = lines.join("\n").trimEnd();
    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const namePart = (host.name || host.hostname).toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.href = url;
    link.download = `terminal-${namePart}-${timestamp}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Focus terminal when pane becomes active
  useEffect(() => {
    if (isActive && termRef.current) {
      termRef.current.focus();
    }
  }, [isActive]);

  return (
    <div
      onClick={onFocus}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#080c14",
        border: isActive ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
        overflow: "hidden",
      }}
    >
      {/* Search Bar Overlay (Cmd+F) */}
      {showSearch && (
        <div
          style={{
            position: "absolute",
            top: "32px",
            right: "14px",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            borderRadius: "8px",
            padding: "6px 10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
          }}
        >
          <Search size={14} color="#06b6d4" />
          <input
            autoFocus
            type="text"
            placeholder="Find in terminal (Cmd+F)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchAddonRef.current) {
                searchAddonRef.current.findNext(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) handleSearchPrev();
                else handleSearchNext();
              }
              if (e.key === "Escape") {
                setShowSearch(false);
                termRef.current?.focus();
              }
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: "12px",
              outline: "none",
              width: "180px",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          <button
            onClick={handleSearchPrev}
            title="Previous match (Shift+Enter)"
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={handleSearchNext}
            title="Next match (Enter)"
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => {
              setShowSearch(false);
              termRef.current?.focus();
            }}
            title="Close (Esc)"
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pane header info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px",
          background: isActive ? "rgba(6, 182, 212, 0.1)" : "rgba(255, 255, 255, 0.02)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          fontSize: "11px",
          color: isActive ? "#22d3ee" : "#64748b",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isLocal ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              <TermIcon size={12} /> Local macOS Terminal (zsh)
            </span>
          ) : (
            <span>
              {host.name} ({host.hostname}:{host.port})
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {broadcastMode && (
            <span style={{ color: "#fb923c", fontWeight: 700, fontSize: "10px" }}>
              ● BROADCAST SYNC
            </span>
          )}

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Find in terminal (Cmd+F)"
            style={{
              background: "none",
              border: "none",
              color: showSearch ? "#06b6d4" : "#64748b",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search size={13} />
          </button>

          {/* Export Session Log */}
          <button
            onClick={handleExportLog}
            title="Export Session Log (.log)"
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Download size={13} />
          </button>

          {/* Zoom In/Out */}
          <button
            onClick={() => handleZoom(1)}
            title="Zoom font in"
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "1px" }}
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => handleZoom(-1)}
            title="Zoom font out"
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "1px" }}
          >
            <ZoomOut size={12} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: "100%",
          height: "calc(100% - 25px)",
        }}
      />

      {/* Terminal Right-Click Floating Context Menu */}
      {contextMenu && (
        <TerminalContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          detectedPath={contextMenu.detectedPath}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onOpenPathInEditor={onOpenPathInEditor}
          onDownloadPath={handleDownloadPath}
          onOpenSearch={() => setShowSearch(true)}
          onExportLog={handleExportLog}
          onClearBuffer={handleClearBuffer}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

import React, { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HostConfig } from "../types";

interface TerminalViewProps {
  sessionId: string;
  host: HostConfig;
  isActive: boolean;
  onFocus?: () => void;
  broadcastMode?: boolean;
  onBroadcastInput?: (data: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  sessionId,
  host,
  isActive,
  onFocus,
  broadcastMode,
  onBroadcastInput,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: "#080c14",
        foreground: "#f1f5f9",
        cursor: "#06b6d4",
        selectionBackground: "rgba(6, 182, 212, 0.3)",
        black: "#0b0f19",
        red: "#f43f5e",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#d946ef",
        cyan: "#06b6d4",
        white: "#f8fafc",
        brightBlack: "#475569",
        brightRed: "#fb7185",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#e879f9",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowTransparency: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln(`\x1b[1;36m[Theia SSH]\x1b[0m Connecting to \x1b[1m${host.user || "root"}@${host.hostname}:${host.port}\x1b[0m ...`);

    // Initiate SSH connection in backend
    const cols = term.cols || 80;
    const rows = term.rows || 24;

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

    // Listen to incoming data from backend
    const unlistenDataPromise = listen<string>(`ssh-data-${sessionId}`, (event) => {
      term.write(event.payload);
    });

    const unlistenClosePromise = listen<number>(`ssh-close-${sessionId}`, (event) => {
      term.writeln(`\r\n\x1b[1;33m[Theia SSH] Session closed (code: ${event.payload})\x1b[0m`);
    });

    // Send user input to backend
    term.onData((data) => {
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

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      unlistenDataPromise.then((unlisten) => unlisten());
      unlistenClosePromise.then((unlisten) => unlisten());
      term.dispose();
      invoke("ssh_disconnect", { sessionId }).catch(() => {});
    };
  }, [sessionId]);

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
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{host.name} ({host.hostname}:{host.port})</span>
        {broadcastMode && (
          <span style={{ color: "#fb923c", fontWeight: 700, fontSize: "10px" }}>
            ● BROADCAST SYNC
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "calc(100% - 25px)",
        }}
      />
    </div>
  );
};

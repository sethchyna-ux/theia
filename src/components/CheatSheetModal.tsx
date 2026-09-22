import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Command,
  Terminal,
  Globe,
  Sparkles,
  Keyboard,
  Zap,
} from "lucide-react";

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheatItem {
  keys: string[];
  description: string;
  category: "app" | "terminal" | "ssh" | "theia";
  example?: string;
}

export const CheatSheetModal: React.FC<CheatSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const cheatItems: CheatItem[] = [
    // App & Window Navigation
    {
      keys: ["⌘", "K"],
      description: "Open Global Command Palette (hosts, themes, tunnels, snippets)",
      category: "app",
    },
    {
      keys: ["⌘", "T"],
      description: "Open new Local Terminal session (macOS zsh)",
      category: "app",
    },
    {
      keys: ["⌘", "W"],
      description: "Close active session tab",
      category: "app",
    },
    {
      keys: ["⌘", "\\"],
      description: "Toggle Split Pane layout (split terminal side-by-side or vertically)",
      category: "app",
    },
    {
      keys: ["⌘", "F"],
      description: "Search and highlight text in active terminal scrollback",
      category: "app",
    },
    {
      keys: ["⌘", "1..9"],
      description: "Jump directly to tab 1 through 9",
      category: "app",
    },
    {
      keys: ["⌘", "Shift", "R"],
      description: "Start or stop session recording in active tab",
      category: "app",
    },
    {
      keys: ["⌘", "/"],
      description: "Open this Shortcuts & Power Cheat Sheet",
      category: "app",
    },

    // Terminal Signals & UNIX
    {
      keys: ["Ctrl", "C"],
      description: "Send SIGINT to terminate the active foreground process",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "Z"],
      description: "Send SIGTSTP to suspend foreground process to background (resume with fg)",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "D"],
      description: "Send EOF (End of File) / Exit current shell session",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "L"],
      description: "Clear terminal viewport without clearing scrollback history",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "A"],
      description: "Move cursor to the beginning of the command line",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "E"],
      description: "Move cursor to the end of the command line",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "U"],
      description: "Cut all text from beginning of line up to cursor",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "K"],
      description: "Cut all text from cursor position to the end of the line",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "W"],
      description: "Delete the word immediately preceding the cursor",
      category: "terminal",
    },
    {
      keys: ["Ctrl", "R"],
      description: "Reverse incremental search through bash/zsh command history",
      category: "terminal",
    },

    // OpenSSH Power Tips & Escape Sequences
    {
      keys: ["Enter", "~", "."],
      description: "SSH Escape sequence: Kill a frozen/hung SSH connection immediately",
      category: "ssh",
      example: "Press Enter, then type ~. to break out of a non-responsive server",
    },
    {
      keys: ["Enter", "~", "^Z"],
      description: "SSH Escape sequence: Background SSH client and return to local shell",
      category: "ssh",
      example: "Press Enter, then type ~ followed by Ctrl+Z. Resume with 'fg'",
    },
    {
      keys: ["ssh", "-J"],
      description: "ProxyJump Bastion chaining: Access private server via jump host",
      category: "ssh",
      example: "ssh -J bastion.corp.internal:22 prod-db.internal",
    },
    {
      keys: ["ssh", "-L"],
      description: "Local Port Forwarding: Tunnel remote port to your local machine",
      category: "ssh",
      example: "ssh -L 5432:127.0.0.1:5432 user@db-server (access Postgres on localhost:5432)",
    },
    {
      keys: ["ssh", "-R"],
      description: "Remote Reverse Tunnel: Expose your local port on remote server",
      category: "ssh",
      example: "ssh -R 8080:localhost:3000 user@remote (remote accesses your port 3000 via 8080)",
    },
    {
      keys: ["ssh", "-D"],
      description: "Dynamic SOCKS5 Proxy: Route web browser traffic securely through server",
      category: "ssh",
      example: "ssh -D 1080 user@proxy-server",
    },

    // Theia Pro Features
    {
      keys: ["Broadcast"],
      description: "Multi-Exec Mode: Mirror keystrokes across all open terminal tabs simultaneously",
      category: "theia",
    },
    {
      keys: ["Finder Drag"],
      description: "Upload to SFTP by dragging files directly from macOS Finder into Theia",
      category: "theia",
    },
    {
      keys: ["{{var}}"],
      description: "Command Snippet Placeholders: Interactive live variables replaced on-the-fly",
      category: "theia",
    },
    {
      keys: ["Asciinema"],
      description: "Session Recording: Export standard .cast recordings for documentation and sharing",
      category: "theia",
    },
  ];

  const filteredItems = useMemo(() => {
    return cheatItems.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.description.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q)) ||
        (item.example && item.example.toLowerCase().includes(q));

      const matchesCat = activeCategory === "all" || item.category === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [cheatItems, search, activeCategory]);

  if (!isOpen) return null;

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
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: "840px",
          height: "580px",
          backgroundColor: "#0a0f1d",
          border: "1px solid rgba(168, 85, 247, 0.3)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Keyboard size={20} color="#c084fc" />
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                Keyboard Shortcuts & Terminal Cheat Sheet
              </h2>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Quick reference for macOS navigation, UNIX signals, and OpenSSH power tricks
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            gap: "12px",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Search shortcuts, signals, or commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                background: "#080c14",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "all", label: "All", icon: Sparkles },
              { id: "app", label: "App & Tabs", icon: Command },
              { id: "terminal", label: "UNIX Signals", icon: Terminal },
              { id: "ssh", label: "SSH Tricks", icon: Globe },
              { id: "theia", label: "Theia Pro", icon: Zap },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: isActive ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.08)",
                    backgroundColor: isActive ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    color: isActive ? "#d8b4fe" : "#94a3b8",
                  }}
                >
                  <Icon size={12} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Items List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b", fontSize: "13px" }}>
              No shortcuts found matching "{search}".
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                    <span style={{ fontSize: "13px", color: "#f1f5f9", fontWeight: 500 }}>
                      {item.description}
                    </span>
                    {item.example && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "#38bdf8",
                          marginTop: "2px",
                        }}
                      >
                        💡 {item.example}
                      </span>
                    )}
                  </div>

                  {/* Key Combo Badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "22px",
                          padding: "3px 7px",
                          backgroundColor: "#131b2e",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          borderRadius: "5px",
                          color: "#e2e8f0",
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          fontWeight: 600,
                          boxShadow: "0 2px 0 rgba(0, 0, 0, 0.4)",
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15, 23, 42, 0.8)",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <span>Press <kbd style={{ padding: "2px 5px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", color: "#cbd5e1" }}>ESC</kbd> to dismiss cheat sheet</span>
          <span>Theia SSH Engine Pro</span>
        </div>
      </div>
    </div>
  );
};

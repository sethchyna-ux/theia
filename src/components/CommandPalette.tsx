import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Terminal,
  Server,
  Code2,
  Network,
  FolderGit2,
  KeyRound,
  Radio,
  Activity,
  Columns2,
  Rows2,
  Grid2X2,
  Square,
  ArrowRight,
  Palette,
} from "lucide-react";
import { HostConfig, SplitLayout, ActiveView } from "../types";
import { TERMINAL_THEMES } from "../themes";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Actions" | "Hosts" | "Snippets" | "Views" | "Themes";
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: HostConfig[];
  onConnectHost: (host: HostConfig) => void;
  onNewLocalTab: () => void;
  onChangeView: (view: ActiveView) => void;
  onToggleBroadcast: () => void;
  broadcastMode: boolean;
  onToggleHud: () => void;
  hudVisible: boolean;
  onChangeSplitLayout: (layout: SplitLayout) => void;
  onExecuteSnippet: (command: string, broadcast: boolean) => void;
  onChangeTheme?: (themeId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hosts,
  onConnectHost,
  onNewLocalTab,
  onChangeView,
  onToggleBroadcast,
  broadcastMode,
  onToggleHud,
  hudVisible,
  onChangeSplitLayout,
  onChangeTheme,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items list
  const items: CommandItem[] = [
    {
      id: "new_local_tab",
      title: "New Local Terminal",
      subtitle: "Spawn macOS PTY session (zsh) — ⌘T",
      category: "Actions",
      icon: <Terminal size={16} color="#10b981" />,
      action: () => {
        onNewLocalTab();
        onClose();
      },
    },
    {
      id: "toggle_broadcast",
      title: broadcastMode ? "Disable Broadcast Mode" : "Enable Broadcast Mode (Multi-Exec)",
      subtitle: "Send keystrokes to all terminal sessions simultaneously — ⌘B",
      category: "Actions",
      icon: <Radio size={16} color="#f43f5e" />,
      action: () => {
        onToggleBroadcast();
        onClose();
      },
    },
    {
      id: "toggle_hud",
      title: hudVisible ? "Hide Server Telemetry HUD" : "Show Server Telemetry HUD",
      subtitle: "Display live CPU, Memory, Disk and Load average — ⌘H",
      category: "Actions",
      icon: <Activity size={16} color="#06b6d4" />,
      action: () => {
        onToggleHud();
        onClose();
      },
    },
    {
      id: "split_vertical",
      title: "Split Panes Vertically",
      subtitle: "Two side-by-side terminal panes — ⌘⇧D",
      category: "Actions",
      icon: <Columns2 size={16} color="#3b82f6" />,
      action: () => {
        onChangeSplitLayout("vertical");
        onChangeView("terminal");
        onClose();
      },
    },
    {
      id: "split_horizontal",
      title: "Split Panes Horizontally",
      subtitle: "Two stacked terminal panes — ⌘⇧E",
      category: "Actions",
      icon: <Rows2 size={16} color="#3b82f6" />,
      action: () => {
        onChangeSplitLayout("horizontal");
        onChangeView("terminal");
        onClose();
      },
    },
    {
      id: "split_grid",
      title: "Split Panes 2x2 Grid",
      subtitle: "Four quadrant terminal matrix",
      category: "Actions",
      icon: <Grid2X2 size={16} color="#a855f7" />,
      action: () => {
        onChangeSplitLayout("grid");
        onChangeView("terminal");
        onClose();
      },
    },
    {
      id: "split_single",
      title: "Single Terminal Pane",
      subtitle: "Maximize active session",
      category: "Actions",
      icon: <Square size={16} color="#64748b" />,
      action: () => {
        onChangeSplitLayout("single");
        onChangeView("terminal");
        onClose();
      },
    },
    {
      id: "view_sftp",
      title: "Open SFTP File Explorer",
      subtitle: "Dual-pane remote browser and in-app code editor",
      category: "Views",
      icon: <FolderGit2 size={16} color="#10b981" />,
      action: () => {
        onChangeView("sftp");
        onClose();
      },
    },
    {
      id: "view_tunnels",
      title: "Open Port Forwarding & Tunnels",
      subtitle: "Manage Local, Remote, and SOCKS5 tunnels",
      category: "Views",
      icon: <Network size={16} color="#f59e0b" />,
      action: () => {
        onChangeView("tunnels");
        onClose();
      },
    },
    {
      id: "view_snippets",
      title: "Open Snippets & Automations",
      subtitle: "Templated command library with variables",
      category: "Views",
      icon: <Code2 size={16} color="#c084fc" />,
      action: () => {
        onChangeView("snippets");
        onClose();
      },
    },
    {
      id: "view_vault",
      title: "Open Local Key Vault",
      subtitle: "Manage Ed25519 & RSA SSH keys and fingerprints",
      category: "Views",
      icon: <KeyRound size={16} color="#34d399" />,
      action: () => {
        onChangeView("vault");
        onClose();
      },
    },
    // Map existing hosts
    ...hosts.map((h) => ({
      id: `host_${h.id}`,
      title: `SSH: ${h.name}`,
      subtitle: `Connect to ${h.user ? `${h.user}@` : ""}${h.hostname}:${h.port} [${h.group || "Default"}]`,
      category: "Hosts" as const,
      icon: <Server size={16} color="#06b6d4" />,
      action: () => {
        onConnectHost(h);
        onClose();
      },
    })),
    // Themes
    ...Object.values(TERMINAL_THEMES).map((th) => ({
      id: `theme_${th.id}`,
      title: `Theme: ${th.name}`,
      subtitle: `Switch terminal appearance to ${th.name}`,
      category: "Themes" as const,
      icon: <Palette size={16} color={th.cursor} />,
      action: () => {
        onChangeTheme?.(th.id);
        onClose();
      },
    })),
  ];

  // Filter items by query
  const filtered = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "580px",
          maxHeight: "440px",
          backgroundColor: "#0d1424",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            gap: "10px",
          }}
        >
          <Search size={18} color="#06b6d4" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search hosts, snippets... (ESC to exit)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: "14px",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          <kbd
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "11px",
              color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          style={{
            overflowY: "auto",
            maxHeight: "360px",
            padding: "8px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              No matching commands or servers found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: isSelected ? "rgba(6, 182, 212, 0.15)" : "transparent",
                    border: isSelected
                      ? "1px solid rgba(6, 182, 212, 0.3)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "500",
                          color: isSelected ? "#f8fafc" : "#e2e8f0",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: isSelected ? "#94a3b8" : "#64748b",
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={14} color="#22d3ee" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

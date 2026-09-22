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
  Sliders,
  Type,
  Eye,
  X,
} from "lucide-react";
import { HostConfig, SplitLayout, ActiveView } from "../types";
import { TERMINAL_THEMES } from "../themes";
import { MONOSPACE_FONTS } from "../fonts";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Actions" | "Hosts" | "Snippets" | "Views" | "Themes";
  icon: React.ReactNode;
  shortcut?: string;
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
  onOpenSettings?: () => void;
  onChangeFont?: (fontId: string) => void;
  onToggleVibrancy?: () => void;
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
  onOpenSettings,
  onChangeFont,
  onToggleVibrancy,
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
      subtitle: "Spawn native macOS PTY session (zsh)",
      category: "Actions",
      icon: <Terminal size={18} color="#10b981" />,
      shortcut: "⌘T",
      action: () => {
        onNewLocalTab();
        onClose();
      },
    },
    {
      id: "toggle_broadcast",
      title: broadcastMode ? "Disable Broadcast Mode" : "Enable Broadcast Mode (Multi-Exec)",
      subtitle: "Send keystrokes to all terminal sessions simultaneously",
      category: "Actions",
      icon: <Radio size={18} color="#f43f5e" />,
      shortcut: "⌘B",
      action: () => {
        onToggleBroadcast();
        onClose();
      },
    },
    {
      id: "toggle_hud",
      title: hudVisible ? "Hide Server Telemetry HUD" : "Show Server Telemetry HUD",
      subtitle: "Display live CPU, Memory, Disk and Load average",
      category: "Actions",
      icon: <Activity size={18} color="#06b6d4" />,
      shortcut: "⌘H",
      action: () => {
        onToggleHud();
        onClose();
      },
    },
    {
      id: "split_vertical",
      title: "Split Panes Vertically",
      subtitle: "Two side-by-side terminal panes",
      category: "Actions",
      icon: <Columns2 size={18} color="#3b82f6" />,
      shortcut: "⌘⇧D",
      action: () => {
        onChangeSplitLayout("vertical");
        onChangeView("terminal");
        onClose();
      },
    },
    {
      id: "split_horizontal",
      title: "Split Panes Horizontally",
      subtitle: "Two stacked terminal panes",
      category: "Actions",
      icon: <Rows2 size={18} color="#3b82f6" />,
      shortcut: "⌘⇧E",
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
    ...(onOpenSettings
      ? [
          {
            id: "open_settings",
            title: "Open Preferences / Settings",
            subtitle: "Configure monospace fonts, font sizes, vibrancy, and keychain — ⌘,",
            category: "Actions" as const,
            icon: <Sliders size={16} color="#06b6d4" />,
            action: () => {
              onOpenSettings();
              onClose();
            },
          },
        ]
      : []),
    ...(onToggleVibrancy
      ? [
          {
            id: "toggle_vibrancy",
            title: "Toggle Window Vibrancy",
            subtitle: "Switch between translucent frosted glass and opaque background",
            category: "Actions" as const,
            icon: <Eye size={16} color="#22d3ee" />,
            action: () => {
              onToggleVibrancy();
              onClose();
            },
          },
        ]
      : []),
    ...(onChangeFont
      ? MONOSPACE_FONTS.map((font) => ({
          id: `font_${font.id}`,
          title: `Font: ${font.name}`,
          subtitle: font.description,
          category: "Actions" as const,
          icon: <Type size={16} color="#38bdf8" />,
          action: () => {
            onChangeFont(font.id);
            onClose();
          },
        }))
      : []),
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
        backgroundColor: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "8vh",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(880px, 92vw)",
          maxHeight: "min(680px, 84vh)",
          backgroundColor: "#0d1424",
          border: "1px solid rgba(6, 182, 212, 0.28)",
          borderRadius: "16px",
          boxShadow: "0 35px 70px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(6, 182, 212, 0.12)",
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
            padding: "16px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            gap: "14px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <Search size={20} color="#06b6d4" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search hosts, snippets, themes, preferences... (ESC to exit)"
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
              fontSize: "16px",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
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
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "5px",
              padding: "3px 8px",
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
            maxHeight: "min(520px, 66vh)",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#64748b",
                fontSize: "14px",
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
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: isSelected ? "rgba(6, 182, 212, 0.14)" : "transparent",
                    border: isSelected
                      ? "1px solid rgba(6, 182, 212, 0.35)"
                      : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundColor: isSelected ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.04)",
                        border: isSelected ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
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
                          fontSize: "14px",
                          fontWeight: "600",
                          color: isSelected ? "#ffffff" : "#f1f5f9",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: isSelected ? "#cbd5e1" : "#94a3b8",
                          marginTop: "2px",
                        }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {item.shortcut && (
                      <kbd
                        style={{
                          backgroundColor: isSelected ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.06)",
                          border: isSelected ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "5px",
                          padding: "2px 7px",
                          fontSize: "11px",
                          color: isSelected ? "#22d3ee" : "#94a3b8",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {item.shortcut}
                      </kbd>
                    )}
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        backgroundColor: isSelected ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        color: isSelected ? "#22d3ee" : "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={16} color="#22d3ee" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Keyboard Navigation Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            fontSize: "11px",
            color: "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", color: "#cbd5e1" }}>↵</kbd>
              <span>Execute</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", color: "#cbd5e1" }}>↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", color: "#cbd5e1" }}>ESC</kbd>
              <span>Close</span>
            </span>
          </div>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>
            {filtered.length} {filtered.length === 1 ? "command" : "commands"} available
          </span>
        </div>
      </div>
    </div>
  );
};

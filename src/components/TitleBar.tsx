import React from "react";
import {
  Plus,
  X,
  Radio,
  Activity,
  Columns2,
  Rows2,
  Grid2X2,
  Square,
  Terminal as TermIcon,
  Server,
  Command,
  Palette,
  Sliders,
  HelpCircle,
  Video,
  Circle,
  Sparkles,
} from "lucide-react";
import { SessionTab, SplitLayout } from "../types";
import { TERMINAL_THEMES } from "../themes";

interface TitleBarProps {
  tabs: SessionTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewLocalTab: () => void;
  onNewConnection: () => void;
  broadcastMode: boolean;
  onToggleBroadcast: () => void;
  hudVisible: boolean;
  onToggleHud: () => void;
  splitLayout: SplitLayout;
  onChangeSplitLayout: (layout: SplitLayout) => void;
  onOpenCommandPalette?: () => void;
  themeId?: string;
  onChangeTheme?: (themeId: string) => void;
  onOpenSettings?: () => void;
  isRecording?: boolean;
  recordingTimer?: number;
  onToggleRecording?: () => void;
  onOpenCheatSheet?: () => void;
  onOpenThemeEditor?: () => void;
  onOpenAbout?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewLocalTab,
  onNewConnection,
  broadcastMode,
  onToggleBroadcast,
  hudVisible,
  onToggleHud,
  splitLayout,
  onChangeSplitLayout,
  onOpenCommandPalette,
  themeId = "obsidian",
  onChangeTheme,
  onOpenSettings,
  isRecording = false,
  recordingTimer = 0,
  onToggleRecording,
  onOpenCheatSheet,
  onOpenThemeEditor,
  onOpenAbout,
}) => {
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);
  return (
    <header
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "44px",
        background: "linear-gradient(to bottom, #0f1626, #090e19)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        paddingLeft: "78px", // Space for macOS native traffic light buttons
        paddingRight: "14px",
        userSelect: "none",
        zIndex: 50,
      }}
    >
      {/* Session Tabs Section & Brand Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          overflowX: "auto",
          maxWidth: "calc(100vw - 520px)",
          height: "100%",
        }}
      >
        {/* Brand Badge */}
        {onOpenAbout && (
          <div
            onClick={onOpenAbout}
            title="About Theia: The Anti-Freemium Manifesto"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "6px",
              cursor: "pointer",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              marginRight: "4px",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <img
              src="/theia-icon.png"
              alt="Theia"
              style={{ width: "16px", height: "16px", borderRadius: "3px" }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#22d3ee",
                letterSpacing: "0.5px",
              }}
            >
              THEIA
            </span>
          </div>
        )}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "6px 6px 0 0",
                background: isActive
                  ? "rgba(19, 27, 46, 0.95)"
                  : "rgba(13, 18, 30, 0.5)",
                border: isActive
                  ? "1px solid rgba(6, 182, 212, 0.3)"
                  : "1px solid rgba(255, 255, 255, 0.05)",
                borderBottom: isActive ? "none" : undefined,
                color: isActive ? "#ffffff" : "#94a3b8",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: tab.connected ? "#10b981" : "#f59e0b",
                  boxShadow: tab.connected ? "0 0 8px #10b981" : "none",
                }}
              />
              <span style={{ whiteSpace: "nowrap" }}>{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* New Local Terminal Button (⌘T) */}
        <button
          onClick={onNewLocalTab}
          title="New Local Terminal (⌘T)"
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "6px",
            color: "#34d399",
            padding: "5px 9px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
          }}
        >
          <Plus size={12} />
          <TermIcon size={12} />
          <span>Terminal</span>
        </button>

        {/* New SSH Host Button (⌘N) */}
        <button
          onClick={onNewConnection}
          title="Connect to SSH Host (⌘N)"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            color: "#94a3b8",
            padding: "5px 9px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#22d3ee";
            e.currentTarget.style.borderColor = "#22d3ee";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
          }}
        >
          <Server size={12} />
          <span>Host</span>
        </button>
      </div>

      {/* Right Controls: Command Palette, Broadcast, Split layout, HUD */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title="Command Palette (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#cbd5e1",
            }}
          >
            <Command size={11} color="#06b6d4" />
            <span>⌘K</span>
          </button>
        )}

        {onOpenCheatSheet && (
          <button
            onClick={onOpenCheatSheet}
            title="Shortcuts & Command Cheat Sheet (⌘/)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#cbd5e1",
            }}
          >
            <HelpCircle size={12} color="#c084fc" />
            <span>⌘/</span>
          </button>
        )}

        {onToggleRecording && (
          <button
            onClick={onToggleRecording}
            title={isRecording ? "Stop Session Recording" : "Record Terminal Session (Asciinema .cast)"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              border: isRecording ? "1px solid #f43f5e" : "1px solid rgba(255, 255, 255, 0.1)",
              background: isRecording ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: isRecording ? "#fda4af" : "#94a3b8",
              boxShadow: isRecording ? "0 0 10px rgba(244, 63, 94, 0.3)" : "none",
            }}
          >
            {isRecording ? (
              <>
                <Circle size={8} fill="#f43f5e" color="#f43f5e" className="animate-pulse" />
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  REC {Math.floor(recordingTimer / 60).toString().padStart(2, "0")}:{(recordingTimer % 60).toString().padStart(2, "0")}
                </span>
              </>
            ) : (
              <>
                <Video size={12} />
                <span>Record</span>
              </>
            )}
          </button>
        )}

        {/* Theme Picker Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowThemeMenu((prev) => !prev)}
            title="Terminal Theme"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: showThemeMenu ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.04)",
              color: showThemeMenu ? "#22d3ee" : "#cbd5e1",
            }}
          >
            <Palette size={12} />
            <span>{TERMINAL_THEMES[themeId]?.name || "Theme"}</span>
          </button>

          {showThemeMenu && (
            <div
              style={{
                position: "absolute",
                top: "34px",
                right: 0,
                width: "190px",
                backgroundColor: "#0d1424",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "6px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.7)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {Object.values(TERMINAL_THEMES).map((th) => (
                <button
                  key={th.id}
                  onClick={() => {
                    onChangeTheme?.(th.id);
                    setShowThemeMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "5px",
                    border: "none",
                    background: themeId === th.id ? "rgba(6, 182, 212, 0.2)" : "transparent",
                    color: themeId === th.id ? "#22d3ee" : "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: th.cursor,
                      display: "inline-block",
                    }}
                  />
                  <span>{th.name}</span>
                </button>
              ))}

              <div style={{ height: "1px", backgroundColor: "rgba(255, 255, 255, 0.08)", margin: "4px 0" }} />

              <button
                onClick={() => {
                  setShowThemeMenu(false);
                  onOpenThemeEditor?.();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 8px",
                  borderRadius: "5px",
                  border: "none",
                  background: "rgba(6, 182, 212, 0.1)",
                  color: "#22d3ee",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Palette size={12} />
                <span>Theme Studio...</span>
              </button>
            </div>
          )}
        </div>

        {/* Broadcast Mode Toggle */}
        <button
          onClick={onToggleBroadcast}
          title="Broadcast Mode (Multi-Exec): Type once to execute across all open terminal panes simultaneously"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            border: broadcastMode
              ? "1px solid #f97316"
              : "1px solid rgba(255, 255, 255, 0.08)",
            background: broadcastMode
              ? "rgba(249, 115, 22, 0.2)"
              : "rgba(255, 255, 255, 0.04)",
            color: broadcastMode ? "#fb923c" : "#94a3b8",
            boxShadow: broadcastMode ? "0 0 12px rgba(249, 115, 22, 0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Radio size={13} className={broadcastMode ? "animate-pulse" : ""} />
          <span>{broadcastMode ? "BROADCAST ON" : "Broadcast"}</span>
        </button>

        {/* Split Layout Selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "6px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => onChangeSplitLayout("single")}
            title="Single Pane"
            style={{
              padding: "4px",
              background: splitLayout === "single" ? "rgba(6, 182, 212, 0.25)" : "transparent",
              color: splitLayout === "single" ? "#22d3ee" : "#64748b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Square size={13} />
          </button>
          <button
            onClick={() => onChangeSplitLayout("vertical")}
            title="Split Horizontal (Side-by-side)"
            style={{
              padding: "4px",
              background: splitLayout === "vertical" ? "rgba(6, 182, 212, 0.25)" : "transparent",
              color: splitLayout === "vertical" ? "#22d3ee" : "#64748b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Columns2 size={13} />
          </button>
          <button
            onClick={() => onChangeSplitLayout("horizontal")}
            title="Split Vertical (Top & Bottom)"
            style={{
              padding: "4px",
              background: splitLayout === "horizontal" ? "rgba(6, 182, 212, 0.25)" : "transparent",
              color: splitLayout === "horizontal" ? "#22d3ee" : "#64748b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Rows2 size={13} />
          </button>
          <button
            onClick={() => onChangeSplitLayout("grid")}
            title="2x2 Grid (4 Panes)"
            style={{
              padding: "4px",
              background: splitLayout === "grid" ? "rgba(6, 182, 212, 0.25)" : "transparent",
              color: splitLayout === "grid" ? "#22d3ee" : "#64748b",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Grid2X2 size={13} />
          </button>
        </div>

        {/* Telemetry HUD Toggle */}
        <button
          onClick={onToggleHud}
          title="Toggle Real-Time Server Telemetry HUD"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 8px",
            borderRadius: "6px",
            fontSize: "11px",
            cursor: "pointer",
            border: hudVisible
              ? "1px solid #10b981"
              : "1px solid rgba(255, 255, 255, 0.08)",
            background: hudVisible
              ? "rgba(16, 185, 129, 0.15)"
              : "rgba(255, 255, 255, 0.04)",
            color: hudVisible ? "#34d399" : "#64748b",
          }}
        >
          <Activity size={13} />
          <span>HUD</span>
        </button>

        {/* Preferences / Settings */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="macOS Preferences (Fonts, Vibrancy, Keychain)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(255, 255, 255, 0.04)",
              color: "#94a3b8",
            }}
          >
            <Sliders size={13} />
          </button>
        )}

        {/* About Theia Manifesto */}
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            title="About Theia: The Anti-Freemium Manifesto"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 9px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              background: "rgba(6, 182, 212, 0.08)",
              color: "#22d3ee",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(6, 182, 212, 0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(6, 182, 212, 0.08)";
            }}
          >
            <Sparkles size={12} />
            <span>About</span>
          </button>
        )}
      </div>
    </header>
  );
};

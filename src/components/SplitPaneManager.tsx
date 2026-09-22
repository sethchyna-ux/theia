import React from "react";
import { TerminalView } from "./TerminalView";
import { SessionTab, SplitLayout } from "../types";
import { Radio, X, Server } from "lucide-react";

interface SplitPaneManagerProps {
  tabs: SessionTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  splitLayout: SplitLayout;
  broadcastMode: boolean;
  onBroadcastInput: (data: string) => void;
  themeId?: string;
  fontFamily?: string;
  fontSize?: number;
  onOpenPathInEditor?: (path: string) => void;
}

export const SplitPaneManager: React.FC<SplitPaneManagerProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  splitLayout,
  broadcastMode,
  onBroadcastInput,
  themeId,
  fontFamily,
  fontSize,
  onOpenPathInEditor,
}) => {
  if (tabs.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          backgroundColor: "#080c14",
          color: "#64748b",
          gap: "12px",
        }}
      >
        <Server size={40} color="#334155" />
        <div style={{ fontSize: "16px", fontWeight: "500", color: "#94a3b8" }}>
          No Active Terminal Sessions
        </div>
        <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "340px", textAlign: "center" }}>
          Select a server from the sidebar or click "+" above to launch a lightning-fast SSH session.
        </p>
      </div>
    );
  }

  // Determine how many tabs to render based on layout
  let visibleTabs: SessionTab[] = [];
  if (splitLayout === "single") {
    const active = tabs.find((t) => t.id === activeTabId) || tabs[0];
    visibleTabs = [active];
  } else if (splitLayout === "vertical" || splitLayout === "horizontal") {
    // Up to 2 tabs
    const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
    if (activeIdx !== -1) {
      const other = tabs.find((t) => t.id !== activeTabId);
      visibleTabs = other ? [tabs[activeIdx], other] : [tabs[activeIdx]];
    } else {
      visibleTabs = tabs.slice(0, 2);
    }
  } else if (splitLayout === "grid") {
    // Up to 4 tabs
    visibleTabs = tabs.slice(0, 4);
  }

  // Layout styles
  const getContainerStyle = (): React.CSSProperties => {
    switch (splitLayout) {
      case "vertical":
        return {
          display: "grid",
          gridTemplateColumns: visibleTabs.length > 1 ? "1fr 1fr" : "1fr",
          height: "100%",
          width: "100%",
          gap: "2px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        };
      case "horizontal":
        return {
          display: "grid",
          gridTemplateRows: visibleTabs.length > 1 ? "1fr 1fr" : "1fr",
          height: "100%",
          width: "100%",
          gap: "2px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        };
      case "grid":
        return {
          display: "grid",
          gridTemplateColumns: visibleTabs.length > 1 ? "1fr 1fr" : "1fr",
          gridTemplateRows: visibleTabs.length > 2 ? "1fr 1fr" : "1fr",
          height: "100%",
          width: "100%",
          gap: "2px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        };
      default:
        return {
          display: "flex",
          height: "100%",
          width: "100%",
        };
    }
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Broadcast Mode Alert Banner */}
      {broadcastMode && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "26px",
            backgroundColor: "rgba(244, 63, 94, 0.92)",
            backdropFilter: "blur(4px)",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            zIndex: 60,
            boxShadow: "0 4px 15px rgba(244, 63, 94, 0.4)",
          }}
        >
          <Radio size={13} className="animate-pulse" />
          <span>MULTI-EXEC BROADCAST ACTIVE: Input is synchronized to all {tabs.length} terminal sessions</span>
        </div>
      )}

      <div style={{ ...getContainerStyle(), paddingTop: broadcastMode ? "26px" : "0" }}>
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                backgroundColor: "#080c14",
                border: isActive
                  ? "1px solid #06b6d4"
                  : "1px solid rgba(255, 255, 255, 0.05)",
                boxShadow: isActive ? "inset 0 0 15px rgba(6, 182, 212, 0.15)" : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Pane Sub-header if multi-pane */}
              {splitLayout !== "single" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: "28px",
                    backgroundColor: isActive ? "rgba(6, 182, 212, 0.1)" : "#0d1424",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    padding: "0 10px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: tab.connected ? "#10b981" : "#f59e0b",
                      }}
                    />
                    <span style={{ fontWeight: "600", color: isActive ? "#22d3ee" : "#cbd5e1" }}>
                      {tab.title}
                    </span>
                    <span style={{ color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                      ({tab.host.user ? `${tab.host.user}@` : ""}{tab.host.hostname}:{tab.host.port})
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
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
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Terminal Component */}
              <div style={{ flex: 1, height: "100%", width: "100%", position: "relative" }}>
                <TerminalView
                  sessionId={tab.id}
                  host={tab.host}
                  isActive={isActive}
                  themeId={themeId}
                  fontFamily={fontFamily}
                  customFontSize={fontSize}
                  onFocus={() => onSelectTab(tab.id)}
                  broadcastMode={broadcastMode}
                  onBroadcastInput={onBroadcastInput}
                  onOpenPathInEditor={onOpenPathInEditor}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

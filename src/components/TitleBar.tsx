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
} from "lucide-react";
import { SessionTab, SplitLayout } from "../types";

interface TitleBarProps {
  tabs: SessionTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewConnection: () => void;
  broadcastMode: boolean;
  onToggleBroadcast: () => void;
  hudVisible: boolean;
  onToggleHud: () => void;
  splitLayout: SplitLayout;
  onChangeSplitLayout: (layout: SplitLayout) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewConnection,
  broadcastMode,
  onToggleBroadcast,
  hudVisible,
  onToggleHud,
  splitLayout,
  onChangeSplitLayout,
}) => {
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
      {/* Session Tabs Section */}
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

        <button
          onClick={onNewConnection}
          title="New Connection Tab"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            color: "#94a3b8",
            padding: "5px 8px",
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
          <Plus size={13} />
          <span>Connect</span>
        </button>
      </div>

      {/* Right Controls: Broadcast, Split layout, HUD, Quick Connect */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Broadcast Mode Toggle (Paywalled Feature Unlocked!) */}
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
      </div>
    </header>
  );
};

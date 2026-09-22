import React, { useState } from "react";
import {
  Terminal as TermIcon,
  FolderGit2,
  Network,
  Code2,
  KeyRound,
  Plus,
  Search,
  Folder,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { ActiveView, HostConfig } from "../types";

interface SidebarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  hosts: HostConfig[];
  onConnectHost: (host: HostConfig) => void;
  onOpenNewHostModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onChangeView,
  hosts,
  onConnectHost,
  onOpenNewHostModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // Filter hosts
  const filteredHosts = hosts.filter((h) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      h.hostname.toLowerCase().includes(q) ||
      h.user?.toLowerCase().includes(q) ||
      h.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Group hosts by group
  const groupedHosts = filteredHosts.reduce<Record<string, HostConfig[]>>((acc, host) => {
    const grp = host.group || "Ungrouped";
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(host);
    return acc;
  }, {});

  return (
    <aside
      style={{
        display: "flex",
        width: "300px",
        height: "calc(100vh - 44px)",
        background: "rgba(10, 15, 26, 0.95)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        userSelect: "none",
        zIndex: 40,
      }}
    >
      {/* 1. Icon Rail (Leftmost thin bar) */}
      <div
        style={{
          width: "52px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "14px",
          gap: "14px",
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          background: "rgba(8, 12, 20, 0.9)",
        }}
      >
        <button
          onClick={() => onChangeView("terminal")}
          title="Terminal Sessions"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            background: activeView === "terminal" ? "rgba(6, 182, 212, 0.2)" : "transparent",
            color: activeView === "terminal" ? "#22d3ee" : "#64748b",
            transition: "all 0.15s ease",
          }}
        >
          <TermIcon size={18} />
        </button>

        <button
          onClick={() => onChangeView("sftp")}
          title="SFTP File Explorer (No Paywall!)"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            background: activeView === "sftp" ? "rgba(16, 185, 129, 0.2)" : "transparent",
            color: activeView === "sftp" ? "#34d399" : "#64748b",
            transition: "all 0.15s ease",
          }}
        >
          <FolderGit2 size={18} />
        </button>

        <button
          onClick={() => onChangeView("tunnels")}
          title="Visual Port Forwarding & Tunnels"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            background: activeView === "tunnels" ? "rgba(245, 158, 11, 0.2)" : "transparent",
            color: activeView === "tunnels" ? "#fbbf24" : "#64748b",
            transition: "all 0.15s ease",
          }}
        >
          <Network size={18} />
        </button>

        <button
          onClick={() => onChangeView("snippets")}
          title="Snippet & Automation Library"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            background: activeView === "snippets" ? "rgba(139, 92, 246, 0.2)" : "transparent",
            color: activeView === "snippets" ? "#a78bfa" : "#64748b",
            transition: "all 0.15s ease",
          }}
        >
          <Code2 size={18} />
        </button>

        <button
          onClick={() => onChangeView("vault")}
          title="SSH Key Vault & Generator"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            background: activeView === "vault" ? "rgba(244, 63, 94, 0.2)" : "transparent",
            color: activeView === "vault" ? "#fb7185" : "#64748b",
            transition: "all 0.15s ease",
          }}
        >
          <KeyRound size={18} />
        </button>
      </div>

      {/* 2. Main Sidebar Content (Host Tree & Groups) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "14px",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 10px",
            marginBottom: "14px",
          }}
        >
          <Search size={14} color="#64748b" />
          <input
            type="text"
            placeholder="Search hosts, IPs, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#f8fafc",
              fontSize: "12px",
              width: "100%",
              outline: "none",
            }}
          />
        </div>

        {/* Section Header with Add Host button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            padding: "0 2px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", letterSpacing: "0.5px" }}>
            SERVERS & CLUSTERS
          </span>
          <button
            onClick={onOpenNewHostModal}
            title="Add New Server Profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "5px",
              color: "#22d3ee",
              fontSize: "11px",
              fontWeight: 600,
              padding: "3px 7px",
              cursor: "pointer",
            }}
          >
            <Plus size={12} />
            <span>Add</span>
          </button>
        </div>

        {/* Grouped Host List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Object.entries(groupedHosts).map(([groupName, groupList]) => {
            const isCollapsed = !!collapsedGroups[groupName];
            return (
              <div key={groupName} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  onClick={() => toggleGroup(groupName)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#94a3b8",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <Folder size={13} color="#06b6d4" />
                  <span>{groupName}</span>
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: "#64748b" }}>
                    {groupList.length}
                  </span>
                </div>

                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "4px", paddingLeft: "10px" }}>
                    {groupList.map((host) => (
                      <div
                        key={host.id}
                        onClick={() => onConnectHost(host)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
                          e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.04)";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                            {host.name}
                          </span>
                          <ArrowUpRight size={12} color="#06b6d4" />
                        </div>
                        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                          {host.user ? `${host.user}@` : ""}{host.hostname}:{host.port}
                        </span>
                        {host.bastion_id && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                            <ShieldAlert size={10} color="#f59e0b" />
                            <span style={{ fontSize: "10px", color: "#f59e0b" }}>
                              via {host.bastion_id}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

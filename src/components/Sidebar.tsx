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
  Edit2,
  Trash2,
  Sliders,
  X,
  Server,
} from "lucide-react";
import { ActiveView, HostConfig } from "../types";

interface SidebarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  hosts: HostConfig[];
  onConnectHost: (host: HostConfig) => void;
  onOpenNewHostModal: () => void;
  onEditHost?: (host: HostConfig) => void;
  onDeleteHost?: (hostId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onChangeView,
  hosts,
  onConnectHost,
  onOpenNewHostModal,
  onEditHost,
  onDeleteHost,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageSearch, setManageSearch] = useState("");

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

  const filteredForManage = hosts.filter((h) => {
    const q = manageSearch.toLowerCase();
    if (!q) return true;
    return (
      h.name.toLowerCase().includes(q) ||
      h.hostname.toLowerCase().includes(q) ||
      h.user?.toLowerCase().includes(q) ||
      h.tags.some((t) => t.toLowerCase().includes(q)) ||
      h.source.toLowerCase().includes(q)
    );
  });

  return (
    <>
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
            title="File Explorer (SFTP & Local)"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              background: activeView === "sftp" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: activeView === "sftp" ? "#22d3ee" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            <FolderGit2 size={18} />
          </button>

          <button
            onClick={() => onChangeView("tunnels")}
            title="Port Forwarding & Tunnels"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              background: activeView === "tunnels" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: activeView === "tunnels" ? "#22d3ee" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            <Network size={18} />
          </button>

          <button
            onClick={() => onChangeView("snippets")}
            title="Snippet & Script Automation Library"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              background: activeView === "snippets" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: activeView === "snippets" ? "#22d3ee" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            <Code2 size={18} />
          </button>

          <button
            onClick={() => onChangeView("vault")}
            title="SSH Key Vault & Known Hosts"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              background: activeView === "vault" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: activeView === "vault" ? "#22d3ee" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            <KeyRound size={18} />
          </button>

          <button
            onClick={() => onChangeView("server")}
            title="SSH Server Hosting & SSH Agent Hub"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              background: activeView === "server" ? "rgba(6, 182, 212, 0.2)" : "transparent",
              color: activeView === "server" ? "#22d3ee" : "#64748b",
              transition: "all 0.15s ease",
            }}
          >
            <Server size={18} />
          </button>
        </div>

        {/* 2. Host Explorer Drawer */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "16px 14px",
            overflowY: "auto",
          }}
        >
          {/* Host Search Input */}
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

          {/* Section Header with Add & Manage Configs buttons */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => setIsManageOpen(true)}
                title="Manage All Server Profiles & Configs"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "5px",
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "3px 6px",
                  cursor: "pointer",
                }}
              >
                <Sliders size={11} />
                <span>Manage</span>
              </button>
              <button
                onClick={onOpenNewHostModal}
                title="Add New Server Profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
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
                            position: "relative",
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
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "#f8fafc" }}>
                                {host.name}
                              </span>
                              {host.source === "ssh_config" && (
                                <span style={{ fontSize: "9px", color: "#94a3b8", backgroundColor: "rgba(255, 255, 255, 0.06)", padding: "1px 4px", borderRadius: "3px" }}>
                                  config
                                </span>
                              )}
                            </div>

                            {/* Action Buttons: Edit, Delete, Connect */}
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onEditHost?.(host)}
                                title="Edit Server Config"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#64748b",
                                  cursor: "pointer",
                                  padding: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                  borderRadius: "3px",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#22d3ee")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Remove server profile "${host.name}"?`)) {
                                    onDeleteHost?.(host.id);
                                  }
                                }}
                                title="Remove Server Config"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#64748b",
                                  cursor: "pointer",
                                  padding: "2px",
                                  display: "flex",
                                  alignItems: "center",
                                  borderRadius: "3px",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                              >
                                <Trash2 size={11} />
                              </button>
                              <div
                                onClick={() => onConnectHost(host)}
                                title="Connect to Server"
                                style={{ display: "flex", alignItems: "center", cursor: "pointer", paddingLeft: "2px" }}
                              >
                                <ArrowUpRight size={12} color="#06b6d4" />
                              </div>
                            </div>
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

      {/* Full Manage Configs Modal */}
      {isManageOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#0d1424",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              width: "720px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(6, 182, 212, 0.15)",
                    color: "#06b6d4",
                  }}
                >
                  <Server size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#f8fafc" }}>
                    Manage Server Profiles & SSH Configs
                  </h3>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {hosts.length} profiles loaded (Bookmarks & ~/.ssh/config)
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => {
                    setIsManageOpen(false);
                    onOpenNewHostModal();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    backgroundColor: "#06b6d4",
                    color: "#080c14",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} />
                  <span>New Profile</span>
                </button>
                <button
                  onClick={() => setIsManageOpen(false)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search filter in Manage modal */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                }}
              >
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Filter by name, hostname, user, tag, or source..."
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
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
            </div>

            {/* Profiles List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredForManage.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>
                  No profiles matching "{manageSearch}"
                </div>
              ) : (
                filteredForManage.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                          {h.name}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: h.source === "ssh_config" ? "rgba(168, 85, 247, 0.15)" : "rgba(6, 182, 212, 0.15)",
                            color: h.source === "ssh_config" ? "#c084fc" : "#22d3ee",
                          }}
                        >
                          {h.source === "ssh_config" ? "OpenSSH Config" : "Saved Bookmark"}
                        </span>
                        {h.group && (
                          <span style={{ fontSize: "10px", color: "#64748b" }}>
                            • {h.group}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "3px", fontSize: "11px", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        <span>{h.user ? `${h.user}@` : ""}{h.hostname}:{h.port}</span>
                        {h.identity_file && <span style={{ color: "#64748b" }}>Key: {h.identity_file.split("/").pop()}</span>}
                        {h.bastion_id && <span style={{ color: "#f59e0b" }}>Jump: {h.bastion_id}</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => {
                          setIsManageOpen(false);
                          onConnectHost(h);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "5px",
                          backgroundColor: "rgba(6, 182, 212, 0.15)",
                          border: "1px solid rgba(6, 182, 212, 0.3)",
                          color: "#22d3ee",
                          fontSize: "11px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        <ArrowUpRight size={11} />
                        <span>Connect</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsManageOpen(false);
                          onEditHost?.(h);
                        }}
                        title="Edit config"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#cbd5e1",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        <Edit2 size={11} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Remove "${h.name}" from profiles?`)) {
                            onDeleteHost?.(h.id);
                          }
                        }}
                        title="Remove config"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "5px",
                          backgroundColor: "rgba(244, 63, 94, 0.1)",
                          border: "1px solid rgba(244, 63, 94, 0.3)",
                          color: "#f43f5e",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={11} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

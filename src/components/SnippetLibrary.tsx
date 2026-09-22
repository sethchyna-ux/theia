import React, { useState, useEffect, useMemo } from "react";
import {
  Code2,
  Plus,
  Play,
  Copy,
  Trash2,
  Search,
  Check,
  Edit3,
  X,
  Terminal,
  Layers,
  Sliders,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Snippet } from "../types";

interface SnippetLibraryProps {
  onExecuteSnippet: (command: string, broadcast: boolean) => void;
}

export const SnippetLibrary: React.FC<SnippetLibraryProps> = ({
  onExecuteSnippet,
}) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Parameter bindings for current selected snippet
  const [params, setParams] = useState<Record<string, string>>({});
  const [broadcastMode, setBroadcastMode] = useState(false);

  // Edit / Create mode in right panel
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formScript, setFormScript] = useState("");
  const [formTags, setFormTags] = useState("");

  const defaultSnippets: Snippet[] = [
    {
      id: "sys_diag",
      name: "Deep System Health & IO",
      description: "Inspect top CPU, memory hogs, disk usage and IO load in one sweep",
      script:
        "echo '=== CPU & Load ===' && uptime && echo '=== Memory ===' && free -h && echo '=== Disk Space ===' && df -h /",
      tags: ["ops", "system", "monitoring"],
    },
    {
      id: "docker_clean",
      name: "Prune Dead Containers & Cache",
      description: "Safely cleans stopped containers, dangling volumes, and build cache",
      script: "docker system prune -af --volumes",
      tags: ["docker", "devops"],
    },
    {
      id: "find_listening_ports",
      name: "Find Process on Port {{port}}",
      description: "Locate PID and socket listening on target port",
      script: "sudo ss -tulpn | grep :{{port}} || sudo lsof -i :{{port}}",
      tags: ["network", "debug"],
    },
    {
      id: "tail_nginx",
      name: "Stream Service Logs ({{service}})",
      description: "Follow recent service journal logs with timestamps",
      script: "journalctl -u {{service}} -f -n 100 --output=short-iso",
      tags: ["logs", "systemd"],
    },
    {
      id: "nginx_reload",
      name: "Nginx Syntax Test & Graceful Reload",
      description: "Validates configuration syntax before reloading workers",
      script: "sudo nginx -t && sudo systemctl reload nginx",
      tags: ["web", "nginx"],
    },
    {
      id: "git_status_clean",
      name: "Git Repo Status & Clean Branches",
      description: "Show working tree status and prune obsolete remote tracking branches",
      script: "git status -s && git remote prune origin",
      tags: ["git", "dev"],
    },
  ];

  const loadSnippets = async () => {
    try {
      const data = await invoke<Snippet[]>("get_snippets");
      if (data && data.length > 0) {
        setSnippets(data);
        if (!selectedSnippetId) {
          setSelectedSnippetId(data[0].id);
        }
      } else {
        setSnippets(defaultSnippets);
        if (!selectedSnippetId) {
          setSelectedSnippetId(defaultSnippets[0].id);
        }
      }
    } catch (_) {
      setSnippets(defaultSnippets);
      if (!selectedSnippetId) {
        setSelectedSnippetId(defaultSnippets[0].id);
      }
    }
  };

  useEffect(() => {
    loadSnippets();
  }, []);

  const selectedSnippet = useMemo(() => {
    return snippets.find((s) => s.id === selectedSnippetId) || snippets[0] || null;
  }, [snippets, selectedSnippetId]);

  // Extract variables when selected snippet changes
  useEffect(() => {
    if (selectedSnippet) {
      const matches = Array.from(selectedSnippet.script.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g));
      const uniqueKeys = Array.from(new Set(matches.map((m) => m[1])));
      const initial: Record<string, string> = {};
      uniqueKeys.forEach((k) => {
        initial[k] = params[k] || "";
      });
      setParams(initial);
      setIsEditing(false);
      setIsCreating(false);
    }
  }, [selectedSnippet?.id]);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    snippets.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [snippets]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.script.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTag = !selectedTag || s.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [snippets, search, selectedTag]);

  // Resolved command with replaced parameters
  const resolvedCommand = useMemo(() => {
    if (!selectedSnippet) return "";
    let finalScript = selectedSnippet.script;
    for (const [key, value] of Object.entries(params)) {
      finalScript = finalScript.split(`{{${key}}}`).join(value.trim() || `[${key}]`);
    }
    return finalScript;
  }, [selectedSnippet, params]);

  const handleRun = () => {
    if (!resolvedCommand) return;
    onExecuteSnippet(resolvedCommand, broadcastMode);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setFormName("");
    setFormDesc("");
    setFormScript("");
    setFormTags("");
  };

  const handleStartEdit = (snip: Snippet) => {
    setIsEditing(true);
    setIsCreating(false);
    setFormName(snip.name);
    setFormDesc(snip.description || "");
    setFormScript(snip.script);
    setFormTags(snip.tags.join(", "));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formScript.trim()) return;

    const newSnippet: Snippet = {
      id: isEditing && selectedSnippet ? selectedSnippet.id : `snip_${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      script: formScript.trim(),
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      await invoke("save_snippet", { snippet: newSnippet });
      setIsCreating(false);
      setIsEditing(false);
      await loadSnippets();
      setSelectedSnippetId(newSnippet.id);
    } catch (err) {
      console.error("Failed to save snippet:", err);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleQuickRun = (snip: Snippet, e: React.MouseEvent) => {
    e.stopPropagation();
    if (snip.script.includes("{{")) {
      setSelectedSnippetId(snip.id);
      setIsCreating(false);
      setIsEditing(false);
    } else {
      onExecuteSnippet(snip.script, false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3500);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await invoke("delete_snippet", { id });
      const nextSnippets = snippets.filter((s) => s.id !== id);
      setSnippets(nextSnippets);
      if (selectedSnippetId === id) {
        setSelectedSnippetId(nextSnippets[0]?.id || null);
      }
    } catch (err) {
      console.error("Failed to delete snippet:", err);
    }
  };

  const paramKeys = Object.keys(params);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: "100%",
        backgroundColor: "#080c14",
        color: "#f1f5f9",
        overflow: "hidden",
      }}
    >
      {/* ============================================================ */}
      {/* LEFT COLUMN: Full Height Snippet List as Large as Main Screen */}
      {/* ============================================================ */}
      <div
        style={{
          width: "380px",
          minWidth: "320px",
          maxWidth: "460px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(10, 15, 26, 0.7)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Top Header & Search */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Code2 size={18} color="#c084fc" />
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
                Command Snippets
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  color: "#c084fc",
                  fontWeight: 600,
                }}
              >
                {snippets.length}
              </span>
            </div>

            <button
              onClick={handleStartCreate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "#9333ea",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 0 12px rgba(147, 51, 234, 0.35)",
              }}
            >
              <Plus size={14} /> New
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Search scripts, tags, commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#080c14",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "6px 10px 6px 30px",
                fontSize: "12px",
                color: "#e2e8f0",
                outline: "none",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Tag Filter Chips */}
          {allTags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "2px",
                scrollbarWidth: "none",
              }}
            >
              <button
                onClick={() => setSelectedTag(null)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: selectedTag === null ? "#a855f7" : "rgba(255, 255, 255, 0.1)",
                  backgroundColor: selectedTag === null ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  color: selectedTag === null ? "#d8b4fe" : "#94a3b8",
                  whiteSpace: "nowrap",
                }}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: selectedTag === tag ? "#a855f7" : "rgba(255, 255, 255, 0.1)",
                    backgroundColor: selectedTag === tag ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.03)",
                    color: selectedTag === tag ? "#d8b4fe" : "#94a3b8",
                    whiteSpace: "nowrap",
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Snippets List - Expansive Full Height */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {filteredSnippets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#64748b", fontSize: "12px" }}>
              No snippets matched your search.
            </div>
          ) : (
            filteredSnippets.map((snip) => {
              const isSelected = selectedSnippet?.id === snip.id && !isCreating;
              const hasVars = snip.script.includes("{{");

              return (
                <div
                  key={snip.id}
                  onClick={() => {
                    setSelectedSnippetId(snip.id);
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    backgroundColor: isSelected ? "rgba(168, 85, 247, 0.12)" : "rgba(255, 255, 255, 0.02)",
                    border: isSelected
                      ? "1px solid rgba(168, 85, 247, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.04)",
                    borderLeft: isSelected ? "3px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: isSelected ? "#f8fafc" : "#e2e8f0",
                      }}
                    >
                      {snip.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {hasVars && (
                        <span
                          title="Contains dynamic variables {{...}}"
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "rgba(6, 182, 212, 0.15)",
                            color: "#22d3ee",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {"{{var}}"}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleQuickRun(snip, e)}
                        title={hasVars ? "Fill variables & run" : "Quick execute on active terminal"}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(147, 51, 234, 0.2)",
                          border: "1px solid rgba(168, 85, 247, 0.4)",
                          color: "#d8b4fe",
                          fontSize: "10px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <Play size={9} fill="#d8b4fe" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>

                  {snip.description && (
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: "11px",
                        color: "#94a3b8",
                        lineHeight: "1.4",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {snip.description}
                    </p>
                  )}

                  {/* Monospace preview line */}
                  <div
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "#38bdf8",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: "6px",
                    }}
                  >
                    {snip.script}
                  </div>

                  {/* Tags */}
                  {snip.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {snip.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.04)",
                            color: "#94a3b8",
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Detail Workspace, Inline Parameters & Execution */}
      {/* ============================================================ */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#090d18",
          overflowY: "auto",
        }}
      >
        {/* If Creating or Editing */}
        {isCreating || isEditing ? (
          <div style={{ padding: "28px 36px", maxWidth: "800px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Edit3 size={20} color="#c084fc" />
                <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                  {isCreating ? "Create New Snippet" : `Edit Snippet: ${selectedSnippet?.name}`}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Snippet Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Restart Production Nginx"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0d1322",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tests configuration syntax then gracefully reloads worker processes"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0d1322",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#cbd5e1" }}>
                    Command Script *
                  </label>
                  <span style={{ fontSize: "11px", color: "#22d3ee" }}>
                    Tip: Use <code style={{ color: "#38bdf8" }}>{"{{variable_name}}"}</code> for placeholders
                  </span>
                </div>
                <textarea
                  placeholder={"docker ps -a --filter name={{container_name}}\nsudo systemctl restart {{service}}"}
                  value={formScript}
                  onChange={(e) => setFormScript(e.target.value)}
                  rows={6}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "#060911",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#38bdf8",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="docker, devops, monitoring"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#0d1322",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94a3b8",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    background: "#9333ea",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(147, 51, 234, 0.4)",
                  }}
                >
                  Save Snippet
                </button>
              </div>
            </form>
          </div>
        ) : selectedSnippet ? (
          /* Normal Snippet Detail & Runner View */
          <div style={{ padding: "28px 36px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header with Title & Action Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: "18px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                    {selectedSnippet.name}
                  </h1>
                </div>
                {selectedSnippet.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
                    {selectedSnippet.description}
                  </p>
                )}
                {selectedSnippet.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                    {selectedSnippet.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(168, 85, 247, 0.15)",
                          color: "#c084fc",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit / Delete / Copy Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => copyToClipboard(resolvedCommand, "top_copy")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {copiedId === "top_copy" ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copiedId === "top_copy" ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={() => handleStartEdit(selectedSnippet)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>

                <button
                  onClick={handleRun}
                  title="Execute snippet directly on active terminal"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 16px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, #9333ea, #6366f1)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 0 12px rgba(147, 51, 234, 0.35)",
                  }}
                >
                  <Play size={12} fill="#ffffff" />
                  <span>Execute</span>
                </button>

                <button
                  onClick={() => handleDelete(selectedSnippet.id)}
                  title={confirmDeleteId === selectedSnippet.id ? "Click again to confirm delete" : "Delete snippet"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    background: confirmDeleteId === selectedSnippet.id ? "rgba(244, 63, 94, 0.3)" : "rgba(244, 63, 94, 0.1)",
                    border: confirmDeleteId === selectedSnippet.id ? "1px solid #f43f5e" : "1px solid rgba(244, 63, 94, 0.25)",
                    color: "#fda4af",
                    fontSize: "12px",
                    fontWeight: confirmDeleteId === selectedSnippet.id ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  <span>{confirmDeleteId === selectedSnippet.id ? "Confirm Delete?" : "Delete"}</span>
                </button>
              </div>
            </div>

            {/* Parameter Placeholders Section (If parameters exist) */}
            {paramKeys.length > 0 && (
              <div
                style={{
                  background: "rgba(6, 182, 212, 0.05)",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <Sliders size={16} color="#22d3ee" />
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#22d3ee" }}>
                    Configure Command Parameters ({paramKeys.length})
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {paramKeys.map((k) => (
                    <div key={k}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#94a3b8",
                          fontFamily: "var(--font-mono)",
                          marginBottom: "4px",
                        }}
                      >
                        {"{{" + k + "}}"}
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter ${k}...`}
                        value={params[k] || ""}
                        onChange={(e) => setParams({ ...params, [k]: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          background: "#080c14",
                          border: "1px solid rgba(6, 182, 212, 0.3)",
                          borderRadius: "6px",
                          color: "#38bdf8",
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolved Command Preview Box */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8" }}>
                  Command Script Preview
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  Resolved and formatted for terminal execution
                </span>
              </div>
              <div
                style={{
                  backgroundColor: "#050811",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "16px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: "#38bdf8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  lineHeight: "1.6",
                  boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.6)",
                }}
              >
                {resolvedCommand}
              </div>
            </div>

            {/* Execution Controls Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "10px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              {/* Target options */}
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: !broadcastMode ? "#f8fafc" : "#94a3b8",
                    fontWeight: !broadcastMode ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={!broadcastMode}
                    onChange={() => setBroadcastMode(false)}
                    style={{ accentColor: "#9333ea" }}
                  />
                  <Terminal size={14} color="#a855f7" />
                  <span>Run in Active Tab</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: broadcastMode ? "#f8fafc" : "#94a3b8",
                    fontWeight: broadcastMode ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="target"
                    checked={broadcastMode}
                    onChange={() => setBroadcastMode(true)}
                    style={{ accentColor: "#9333ea" }}
                  />
                  <Layers size={14} color="#c084fc" />
                  <span>Broadcast to All Tabs</span>
                </label>
              </div>

              {/* Big Run Button */}
              <button
                onClick={handleRun}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: broadcastMode
                    ? "linear-gradient(135deg, #7c3aed, #db2777)"
                    : "linear-gradient(135deg, #9333ea, #6366f1)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(147, 51, 234, 0.4)",
                  transition: "transform 0.1s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <Play size={16} fill="#ffffff" />
                <span>{broadcastMode ? "Broadcast Command" : "Execute in Terminal"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
            <Code2 size={36} color="#475569" style={{ marginBottom: "12px" }} />
            <p style={{ margin: 0, fontSize: "14px" }}>Select a snippet from the list or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

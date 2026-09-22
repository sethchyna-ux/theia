import React, { useState, useEffect } from "react";
import {
  Code2,
  Plus,
  Play,
  Copy,
  Trash2,
  Tag,
  Search,
  Sparkles,
  Check,
  Edit3,
  X,
  Radio,
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
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formScript, setFormScript] = useState("");
  const [formTags, setFormTags] = useState("");

  // Variable replacement modal
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [activeSnippetForRun, setActiveSnippetForRun] = useState<Snippet | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [runBroadcast, setRunBroadcast] = useState(false);

  const loadSnippets = async () => {
    try {
      const data = await invoke<Snippet[]>("get_snippets");
      setSnippets(data);
    } catch (_) {
      // Fallback defaults
      setSnippets([
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
      ]);
    }
  };

  useEffect(() => {
    loadSnippets();
  }, []);

  const openCreateModal = () => {
    setEditingSnippet(null);
    setFormName("");
    setFormDesc("");
    setFormScript("");
    setFormTags("");
    setModalOpen(true);
  };

  const openEditModal = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setFormName(snippet.name);
    setFormDesc(snippet.description || "");
    setFormScript(snippet.script);
    setFormTags(snippet.tags.join(", "));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formScript.trim()) return;

    const snippet: Snippet = {
      id: editingSnippet ? editingSnippet.id : `snip_${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      script: formScript.trim(),
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      await invoke("save_snippet", { snippet });
      setModalOpen(false);
      loadSnippets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this snippet?")) return;
    try {
      await invoke("delete_snippet", { id });
      loadSnippets();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.script);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Check if snippet contains variables like {{var}}
  const handleRunClick = (snippet: Snippet) => {
    const matches = Array.from(snippet.script.matchAll(/\{\{([a-zA-Z0-9_-]+)\}\}/g));
    const uniqueKeys = Array.from(new Set(matches.map((m) => m[1])));

    if (uniqueKeys.length > 0) {
      // Prompt for variables
      const initialParams: Record<string, string> = {};
      uniqueKeys.forEach((k) => (initialParams[k] = ""));
      setParams(initialParams);
      setActiveSnippetForRun(snippet);
      setRunBroadcast(false);
      setParamModalOpen(true);
    } else {
      onExecuteSnippet(snippet.script, false);
    }
  };

  const handleExecuteWithParams = () => {
    if (!activeSnippetForRun) return;
    let finalScript = activeSnippetForRun.script;
    for (const [key, value] of Object.entries(params)) {
      finalScript = finalScript.split(`{{${key}}}`).join(value || `[${key}]`);
    }
    setParamModalOpen(false);
    onExecuteSnippet(finalScript, runBroadcast);
  };

  const filtered = snippets.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      s.script.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#080c14",
        color: "#e2e8f0",
        padding: "24px 32px",
        overflowY: "auto",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "18px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(168, 85, 247, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c084fc",
              }}
            >
              <Code2 size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                Snippet & Script Automation Library
              </h1>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
                Multi-line commands with parameterized placeholders ({"{{variable}}"})
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Search Bar */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={15}
              style={{ position: "absolute", left: "12px", color: "#64748b" }}
            />
            <input
              type="text"
              placeholder="Search scripts, tags, commands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: "#0d1526",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "8px 12px 8px 34px",
                fontSize: "13px",
                color: "#e2e8f0",
                outline: "none",
                width: "260px",
              }}
            />
          </div>

          <button
            onClick={openCreateModal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#9333ea",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(147, 51, 234, 0.35)",
            }}
          >
            <Plus size={16} /> New Snippet
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(147, 51, 234, 0.08)",
          border: "1px solid rgba(168, 85, 247, 0.25)",
          borderRadius: "8px",
          padding: "12px 18px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles size={18} color="#c084fc" />
          <span style={{ fontSize: "13px", color: "#d8b4fe" }}>
            <strong>Automation Engine:</strong> Reusable multi-line commands with interactive parameter prompts and one-click execution.
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#a855f7", fontWeight: "600" }}>
          {snippets.length} Saved Scripts
        </div>
      </div>

      {/* Snippet Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "18px",
        }}
      >
        {filtered.map((snip) => {
          const hasVars = snip.script.includes("{{");
          return (
            <div
              key={snip.id}
              style={{
                backgroundColor: "#0d1424",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                transition: "border-color 0.15s ease",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "6px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "#f1f5f9",
                      margin: 0,
                    }}
                  >
                    {snip.name}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      onClick={() => openEditModal(snip)}
                      title="Edit snippet"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(snip.id)}
                      title="Delete snippet"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {snip.description && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      margin: "0 0 10px 0",
                      lineHeight: "1.4",
                    }}
                  >
                    {snip.description}
                  </p>
                )}

                {/* Script Code Preview */}
                <div
                  style={{
                    backgroundColor: "#060911",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "12px",
                    color: "#38bdf8",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    maxHeight: "100px",
                    overflowY: "auto",
                    lineHeight: "1.5",
                  }}
                >
                  {snip.script}
                </div>

                {/* Tags */}
                {snip.tags.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "12px",
                    }}
                  >
                    {snip.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          color: "#cbd5e1",
                        }}
                      >
                        <Tag size={10} color="#a855f7" /> {t}
                      </span>
                    ))}
                    {hasVars && (
                      <span
                        style={{
                          backgroundColor: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        Parametric
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  paddingTop: "12px",
                }}
              >
                <button
                  onClick={() => copyToClipboard(snip)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  {copiedId === snip.id ? (
                    <>
                      <Check size={14} color="#10b981" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleRunClick(snip)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#0ea5e9",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    boxShadow: "0 0 12px rgba(14, 165, 233, 0.3)",
                  }}
                >
                  <Play size={13} fill="#ffffff" /> Run to Terminal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New / Edit Snippet Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              width: "560px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                {editingSnippet ? "Edit Snippet" : "Create New Snippet"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Snippet Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Purge Docker Cache"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="What does this automation accomplish?"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                      Script / Shell Commands
                    </label>
                    <span style={{ fontSize: "11px", color: "#a855f7" }}>
                      Supports {"{{param}}"} variables
                    </span>
                  </div>
                  <textarea
                    required
                    rows={6}
                    placeholder={"journalctl -u {{service}} -f\nsudo nginx -s reload"}
                    value={formScript}
                    onChange={(e) => setFormScript(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "#38bdf8",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "12px",
                      outline: "none",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="docker, maintenance, logs"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    color: "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#9333ea",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 20px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  {editingSnippet ? "Save Changes" : "Create Snippet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variable Parameters Modal */}
      {paramModalOpen && activeSnippetForRun && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              width: "480px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>
                  Fill Command Variables
                </h2>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {activeSnippetForRun.name}
                </span>
              </div>
              <button
                onClick={() => setParamModalOpen(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
              {Object.keys(params).map((key) => (
                <div key={key}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "#38bdf8",
                      fontFamily: "'JetBrains Mono', monospace",
                      marginBottom: "6px",
                    }}
                  >
                    {"{{"}
                    {key}
                    {"}}"}
                  </label>
                  <input
                    type="text"
                    placeholder={`Enter value for ${key}`}
                    value={params[key]}
                    onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                    style={{
                      width: "100%",
                      backgroundColor: "#060911",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#f8fafc",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              {/* Target Broadcast Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <input
                  type="checkbox"
                  id="broadcastCheck"
                  checked={runBroadcast}
                  onChange={(e) => setRunBroadcast(e.target.checked)}
                  style={{ accentColor: "#f43f5e", cursor: "pointer" }}
                />
                <label
                  htmlFor="broadcastCheck"
                  style={{
                    fontSize: "12px",
                    color: runBroadcast ? "#f43f5e" : "#cbd5e1",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Radio size={13} /> Broadcast to all open terminal tabs simultaneously
                </label>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setParamModalOpen(false)}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteWithParams}
                style={{
                  backgroundColor: "#0ea5e9",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 20px",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

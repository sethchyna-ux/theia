import React, { useState, useEffect } from "react";
import {
  Folder,
  File,
  FileCode,
  FileArchive,
  ArrowLeft,
  RefreshCw,
  FolderPlus,
  Upload,
  Trash2,
  Edit3,
  X,
  Save,
  Check,
  Home,
  HardDrive,
  Globe,
  AlertCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { RemoteFileEntry, SessionTab } from "../types";

interface SftpExplorerProps {
  tabs: SessionTab[];
  activeTabId: string | null;
}

export const SftpExplorer: React.FC<SftpExplorerProps> = ({ tabs, activeTabId }) => {
  // Target session: either a connected remote tab or local filesystem
  const [targetSessionId, setTargetSessionId] = useState<string>(activeTabId || "local_default");
  const [currentPath, setCurrentPath] = useState("~");
  const [pathInput, setPathInput] = useState("~");
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Editor modal state
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New folder state
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  // Update targetSessionId if activeTabId changes to an ssh tab
  useEffect(() => {
    if (activeTabId && tabs.some((t) => t.id === activeTabId)) {
      setTargetSessionId(activeTabId);
    }
  }, [activeTabId, tabs]);

  const isLocalTarget = targetSessionId.startsWith("local");

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await invoke<RemoteFileEntry[]>("sftp_list", {
        sessionId: targetSessionId,
        path,
      });
      // Sort: directories first, then alphabetical
      const sorted = [...result].sort((a, b) => {
        if (a.is_dir && !b.is_dir) return -1;
        if (!a.is_dir && b.is_dir) return 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(sorted);
      setCurrentPath(path);
      setPathInput(path);
    } catch (err: any) {
      console.error("Failed to list directory:", err);
      setErrorMsg(typeof err === "string" ? err : err?.message || "Failed to read directory");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, [targetSessionId]);

  const handleProcessUploadFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetPath = currentPath.endsWith("/")
        ? `${currentPath}${file.name}`
        : `${currentPath}/${file.name}`;
      try {
        const text = await file.text();
        await invoke("sftp_write", {
          sessionId: targetSessionId,
          path: targetPath,
          content: text,
        });
      } catch (err: any) {
        console.error("Failed to upload file:", err);
        alert(`Failed to upload ${file.name}: ${err?.message || err}`);
      }
    }
    await loadDirectory(currentPath);
    setLoading(false);
  };

  const handleOpenEntry = async (entry: RemoteFileEntry) => {
    if (entry.is_dir) {
      loadDirectory(entry.path);
    } else {
      try {
        const content = await invoke<string>("sftp_read", {
          sessionId: targetSessionId,
          path: entry.path,
        });
        setEditingFile({ path: entry.path, content });
      } catch (err: any) {
        alert(`Failed to read file: ${err?.message || err}`);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      await invoke("sftp_write", {
        sessionId: targetSessionId,
        path: editingFile.path,
        content: editingFile.content,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(`Failed to save file: ${err?.message || err}`);
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const path = `${currentPath}/${newFolderName.trim()}`.replace("//", "/");
    try {
      await invoke("sftp_mkdir", { sessionId: targetSessionId, path });
      setShowNewFolderModal(false);
      setNewFolderName("");
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(`Failed to create directory: ${err?.message || err}`);
    }
  };

  const handleDeleteEntry = async (entry: RemoteFileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete '${entry.name}'?`)) return;
    try {
      await invoke("sftp_delete", { sessionId: targetSessionId, path: entry.path });
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(`Failed to delete '${entry.name}': ${err?.message || err}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "--";
    return new Date(timestamp).toLocaleString();
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      loadDirectory(pathInput.trim());
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#080c14",
        color: "#f1f5f9",
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          background: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Target Selector & Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "360px" }}>
          {/* Target Host Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 8px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
              }}
            >
              {isLocalTarget ? <HardDrive size={13} color="#22d3ee" /> : <Globe size={13} color="#34d399" />}
              <select
                value={targetSessionId}
                onChange={(e) => {
                  setTargetSessionId(e.target.value);
                  setCurrentPath("~");
                  setPathInput("~");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="local_default" style={{ background: "#0f172a" }}>
                  🖥️ Local Filesystem (Mac)
                </option>
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id} style={{ background: "#0f172a" }}>
                    🌐 Remote: {tab.title} ({tab.host?.hostname || tab.host?.name || "remote"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Up Button */}
          <button
            onClick={() => {
              if (currentPath === "/" || currentPath === "~") return;
              const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
              loadDirectory(parent);
            }}
            title="Go up one folder"
            style={{
              padding: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} />
          </button>

          {/* Home Button */}
          <button
            onClick={() => loadDirectory("~")}
            title="Go to Home Directory (~)"
            style={{
              padding: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <Home size={14} />
          </button>

          {/* Address input */}
          <form onSubmit={handlePathSubmit} style={{ flex: 1, display: "flex" }}>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="Path (e.g. /Users/yocan, ~ or /var/log)"
              style={{
                width: "100%",
                padding: "5px 10px",
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "#22d3ee",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                outline: "none",
              }}
            />
          </form>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => loadDirectory(currentPath)}
            title="Refresh Directory"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              background: "rgba(6, 182, 212, 0.15)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "6px",
              color: "#22d3ee",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FolderPlus size={13} />
            <span>New Folder</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleProcessUploadFiles(e.target.files)}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "6px",
              color: "#34d399",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Upload size={13} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div
          style={{
            margin: "12px 18px 0 18px",
            padding: "10px 14px",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "8px",
            color: "#fda4af",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={15} color="#f43f5e" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => loadDirectory("~")}
            style={{
              background: "rgba(244, 63, 94, 0.2)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "4px",
              color: "#fff",
              padding: "3px 8px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Go Home (~)
          </button>
        </div>
      )}

      {/* File Table Container with Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleProcessUploadFiles(e.dataTransfer.files);
        }}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 18px",
          position: "relative",
          border: isDraggingOver ? "2px dashed #06b6d4" : "2px dashed transparent",
          backgroundColor: isDraggingOver ? "rgba(6, 182, 212, 0.05)" : "transparent",
          transition: "all 0.15s ease",
        }}
      >
        {isDraggingOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(8, 12, 20, 0.9)",
              backdropFilter: "blur(6px)",
              zIndex: 30,
              gap: "10px",
            }}
          >
            <Upload size={36} color="#22d3ee" />
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc" }}>
              Drop files here to upload to {currentPath}
            </span>
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", gap: "10px", color: "#94a3b8" }}>
            <RefreshCw size={18} className="animate-spin" />
            <span>Reading directory...</span>
          </div>
        ) : entries.length === 0 && !errorMsg ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b", fontSize: "13px" }}>
            This folder is empty.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ color: "#64748b", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Name</th>
                <th style={{ padding: "8px" }}>Size</th>
                <th style={{ padding: "8px" }}>Modified</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.path}
                  onClick={() => handleOpenEntry(entry)}
                  style={{
                    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6, 182, 212, 0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {entry.is_dir ? (
                      <Folder size={16} color="#06b6d4" />
                    ) : entry.name.endsWith(".conf") ||
                      entry.name.endsWith(".yml") ||
                      entry.name.endsWith(".json") ||
                      entry.name.endsWith(".ts") ||
                      entry.name.endsWith(".rs") ||
                      entry.name.endsWith(".py") ? (
                      <FileCode size={16} color="#f59e0b" />
                    ) : entry.name.endsWith(".gz") || entry.name.endsWith(".tar") || entry.name.endsWith(".zip") ? (
                      <FileArchive size={16} color="#8b5cf6" />
                    ) : (
                      <File size={16} color="#94a3b8" />
                    )}
                    <span style={{ fontWeight: entry.is_dir ? 600 : 400, color: entry.is_dir ? "#f8fafc" : "#cbd5e1" }}>
                      {entry.name}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px", color: "#64748b", fontFamily: "var(--font-mono)" }}>
                    {entry.is_dir ? "--" : formatSize(entry.size)}
                  </td>
                  <td style={{ padding: "10px 8px", color: "#64748b" }}>
                    {formatDate(entry.modified)}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <button
                      onClick={(e) => handleDeleteEntry(entry, e)}
                      title="Delete"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* File Editor Modal */}
      {editingFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: "720px",
              height: "540px",
              background: "#0d131f",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(15, 23, 42, 0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit3 size={15} color="#06b6d4" />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>
                  Editing: {editingFile.path}
                </span>
              </div>
              <button
                onClick={() => setEditingFile(null)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={editingFile.content}
              onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
              style={{
                flex: 1,
                padding: "14px",
                background: "#080c14",
                border: "none",
                color: "#e2e8f0",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                lineHeight: "1.6",
                outline: "none",
                resize: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                padding: "10px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(15, 23, 42, 0.8)",
              }}
            >
              <button
                onClick={() => setEditingFile(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFile}
                disabled={savingFile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  background: saveSuccess ? "#10b981" : "#06b6d4",
                  border: "none",
                  color: "#080c14",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {saveSuccess ? <Check size={14} /> : <Save size={14} />}
                <span>{saveSuccess ? "Saved Successfully" : savingFile ? "Saving..." : "Save File"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: "360px",
              background: "#0d131f",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#f8fafc" }}>
              Create New Directory
            </h3>
            <input
              type="text"
              placeholder="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
                marginBottom: "14px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setShowNewFolderModal(false)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: "5px 14px",
                  borderRadius: "6px",
                  background: "#06b6d4",
                  border: "none",
                  color: "#080c14",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

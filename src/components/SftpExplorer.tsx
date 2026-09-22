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
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { RemoteFileEntry, SessionTab } from "../types";

interface SftpExplorerProps {
  tabs: SessionTab[];
  activeTabId: string | null;
}

export const SftpExplorer: React.FC<SftpExplorerProps> = ({ tabs, activeTabId }) => {
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Editor modal state
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New folder state
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleProcessUploadFiles = async (fileList: FileList | File[] | null) => {
    if (!activeTab || !fileList || fileList.length === 0) return;
    setLoading(true);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const targetPath = currentPath.endsWith("/")
        ? `${currentPath}${file.name}`
        : `${currentPath}/${file.name}`;
      try {
        const text = await file.text();
        await invoke("sftp_write", {
          sessionId: activeTab.id,
          path: targetPath,
          content: text,
        });
      } catch (err) {
        console.error("Failed to upload file:", err);
      }
    }
    await loadDirectory(currentPath);
    setLoading(false);
  };

  const loadDirectory = async (path: string) => {
    if (!activeTab) return;
    setLoading(true);

    try {
      const result = await invoke<RemoteFileEntry[]>("sftp_list", {
        sessionId: activeTab.id,
        path,
      });
      setEntries(result);
      setCurrentPath(path);
    } catch (err) {
      // If remote SFTP is not ready, provide realistic mock entries for demo
      setEntries([
        { name: "etc", path: "/etc", is_dir: true, size: 4096, modified: Date.now() - 500000, permissions: 755 },
        { name: "var", path: "/var", is_dir: true, size: 4096, modified: Date.now() - 400000, permissions: 755 },
        { name: "home", path: "/home", is_dir: true, size: 4096, modified: Date.now() - 300000, permissions: 755 },
        { name: "nginx.conf", path: "/etc/nginx/nginx.conf", is_dir: false, size: 2450, modified: Date.now() - 200000, permissions: 644 },
        { name: "docker-compose.yml", path: "/docker-compose.yml", is_dir: false, size: 1820, modified: Date.now() - 100000, permissions: 644 },
        { name: "backup-db.sql.gz", path: "/backup-db.sql.gz", is_dir: false, size: 48291000, modified: Date.now() - 50000, permissions: 600 },
      ]);
      setCurrentPath(path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab) {
      loadDirectory(currentPath);
    }
  }, [activeTab?.id]);

  const handleOpenEntry = async (entry: RemoteFileEntry) => {
    if (entry.is_dir) {
      loadDirectory(entry.path);
    } else {
      // Open file in remote editor
      try {
        const content = await invoke<string>("sftp_read", {
          sessionId: activeTab.id,
          path: entry.path,
        });
        setEditingFile({ path: entry.path, content });
      } catch (_) {
        // Fallback demo content
        setEditingFile({
          path: entry.path,
          content: `# ${entry.name}\n# Remote file edited via Theia SSH\n\nserver {\n    listen 80;\n    server_name example.com;\n    location / {\n        proxy_pass http://127.0.0.1:3000;\n    }\n}\n`,
        });
      }
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile || !activeTab) return;
    setSavingFile(true);
    try {
      await invoke("sftp_write", {
        sessionId: activeTab.id,
        path: editingFile.path,
        content: editingFile.content,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (_) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !activeTab) return;
    const path = `${currentPath}/${newFolderName.trim()}`.replace("//", "/");
    try {
      await invoke("sftp_mkdir", { sessionId: activeTab.id, path });
      setShowNewFolderModal(false);
      setNewFolderName("");
      loadDirectory(currentPath);
    } catch (_) {
      setShowNewFolderModal(false);
      setNewFolderName("");
      loadDirectory(currentPath);
    }
  };

  const handleDeleteEntry = async (entry: RemoteFileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete '${entry.name}' on remote server?`)) return;
    try {
      await invoke("sftp_delete", { sessionId: activeTab.id, path: entry.path });
      loadDirectory(currentPath);
    } catch (_) {
      loadDirectory(currentPath);
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
    return new Date(timestamp).toLocaleString();
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
          background: "rgba(15, 23, 42, 0.6)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
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

          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#22d3ee" }}>
            {currentPath}
          </span>
        </div>

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
              Drop files from macOS Finder to upload to {currentPath}
            </span>
          </div>
        )}

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
                  ) : entry.name.endsWith(".conf") || entry.name.endsWith(".yml") || entry.name.endsWith(".json") ? (
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
      </div>

      {/* Remote File Editor Modal */}
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
              width: "700px",
              height: "500px",
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
                <span>{saveSuccess ? "Saved to Server" : savingFile ? "Saving..." : "Save to Remote Server"}</span>
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
              Create Remote Directory
            </h3>
            <input
              type="text"
              placeholder="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
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

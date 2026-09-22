import React, { useState } from "react";
import {
  X,
  Palette,
  Check,
  Save,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import {
  TerminalTheme,
  BUILTIN_THEMES,
  getAllThemes,
  saveCustomTheme,
  deleteCustomTheme,
} from "../themes";

interface ThemeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onApplyTheme: (themeId: string) => void;
}

export const ThemeEditorModal: React.FC<ThemeEditorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onApplyTheme,
}) => {
  const allThemes = getAllThemes();
  const initialTheme = allThemes[currentThemeId] || BUILTIN_THEMES.obsidian;

  const [theme, setTheme] = useState<TerminalTheme>({ ...initialTheme });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialTheme.id);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = allThemes[presetId] || BUILTIN_THEMES.obsidian;
    setTheme({
      ...preset,
      id: preset.isCustom ? preset.id : `custom_${preset.id}_${Date.now()}`,
      name: preset.isCustom ? preset.name : `${preset.name} (Custom)`,
    });
  };

  const updateColor = (key: keyof TerminalTheme, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const finalId = theme.id.startsWith("custom_")
      ? theme.id
      : `custom_${theme.id.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const toSave: TerminalTheme = {
      ...theme,
      id: finalId,
      name: theme.name.trim() || "Custom Theme",
      isCustom: true,
    };
    saveCustomTheme(toSave);
    onApplyTheme(toSave.id);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!theme.isCustom) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3500);
      return;
    }
    setConfirmDelete(false);
    deleteCustomTheme(theme.id);
    onApplyTheme("obsidian");
    setTheme({ ...BUILTIN_THEMES.obsidian });
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${theme.id}_theia_theme.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.background && imported.foreground) {
          const customId = `custom_imported_${Date.now()}`;
          const customTheme: TerminalTheme = {
            ...BUILTIN_THEMES.obsidian,
            ...imported,
            id: customId,
            name: imported.name || "Imported Theme",
            isCustom: true,
          };
          saveCustomTheme(customTheme);
          setTheme(customTheme);
          onApplyTheme(customId);
        }
      } catch (err) {
        alert("Invalid theme JSON file");
      }
    };
    reader.readAsText(file);
  };

  const renderColorInput = (label: string, field: keyof TerminalTheme) => {
    const val = theme[field] as string;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ fontSize: "11px", color: "#cbd5e1", width: "110px", flexShrink: 0 }}>
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
          <input
            type="color"
            value={val.startsWith("#") ? val.substring(0, 7) : "#ffffff"}
            onChange={(e) => updateColor(field, e.target.value)}
            style={{
              width: "24px",
              height: "24px",
              padding: 0,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
              background: "transparent",
            }}
          />
          <input
            type="text"
            value={val}
            onChange={(e) => updateColor(field, e.target.value)}
            style={{
              width: "80px",
              padding: "3px 6px",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: "#e2e8f0",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              outline: "none",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: "920px",
          height: "640px",
          backgroundColor: "#0a0f1d",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.7)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Palette size={18} color="#22d3ee" />
            <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
              Terminal Theme Studio & Palette Editor
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-Column Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: Palette Editor Form */}
          <div
            style={{
              width: "440px",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              overflowY: "auto",
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Presets and Template Dropdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>
                Load from Theme Preset
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                style={{
                  padding: "6px 10px",
                  background: "#080c14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  color: "#22d3ee",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <optgroup label="Built-in Presets">
                  {Object.values(BUILTIN_THEMES).map((th) => (
                    <option key={th.id} value={th.id}>
                      {th.name}
                    </option>
                  ))}
                </optgroup>
                {Object.values(allThemes).some((t) => t.isCustom) && (
                  <optgroup label="Custom Themes">
                    {Object.values(allThemes)
                      .filter((t) => t.isCustom)
                      .map((th) => (
                        <option key={th.id} value={th.id}>
                          ⭐ {th.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Theme Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>
                Theme Name
              </label>
              <input
                type="text"
                value={theme.name}
                onChange={(e) => updateColor("name", e.target.value)}
                placeholder="My Vibrant Theme"
                style={{
                  padding: "6px 10px",
                  background: "#080c14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
            </div>

            {/* Base Colors */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#38bdf8" }}>
                Terminal Canvas & Cursor
              </span>
              {renderColorInput("Background", "background")}
              {renderColorInput("Foreground / Text", "foreground")}
              {renderColorInput("Cursor Color", "cursor")}
              {renderColorInput("Selection Fill", "selectionBackground")}
            </div>

            {/* Normal ANSI Colors */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#38bdf8" }}>
                Standard ANSI Colors (0-7)
              </span>
              {renderColorInput("Black (0)", "black")}
              {renderColorInput("Red (1)", "red")}
              {renderColorInput("Green (2)", "green")}
              {renderColorInput("Yellow (3)", "yellow")}
              {renderColorInput("Blue (4)", "blue")}
              {renderColorInput("Magenta (5)", "magenta")}
              {renderColorInput("Cyan (6)", "cyan")}
              {renderColorInput("White (7)", "white")}
            </div>

            {/* Bright ANSI Colors */}
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#38bdf8" }}>
                High-Intensity ANSI Colors (8-15)
              </span>
              {renderColorInput("Bright Black (8)", "brightBlack")}
              {renderColorInput("Bright Red (9)", "brightRed")}
              {renderColorInput("Bright Green (10)", "brightGreen")}
              {renderColorInput("Bright Yellow (11)", "brightYellow")}
              {renderColorInput("Bright Blue (12)", "brightBlue")}
              {renderColorInput("Bright Magenta (13)", "brightMagenta")}
              {renderColorInput("Bright Cyan (14)", "brightCyan")}
              {renderColorInput("Bright White (15)", "brightWhite")}
            </div>
          </div>

          {/* Right: Live Interactive Terminal Preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              backgroundColor: "#070a12",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>
                Live Terminal Preview
              </span>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Updates in real-time as you tweak palette colors
              </span>
            </div>

            {/* Mock Terminal Canvas */}
            <div
              style={{
                flex: 1,
                backgroundColor: theme.background,
                color: theme.foreground,
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "16px",
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                fontSize: "12px",
                lineHeight: "1.6",
                boxShadow: "0 15px 30px rgba(0, 0, 0, 0.6)",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              <div>
                <span style={{ color: theme.green, fontWeight: "bold" }}>user@theia-macbook</span>
                <span style={{ color: theme.white }}>:</span>
                <span style={{ color: theme.blue, fontWeight: "bold" }}>~/workspace/theia</span>
                <span style={{ color: theme.magenta }}> (main*)</span>
                <span style={{ color: theme.foreground }}> $ ls -la</span>
              </div>
              <div style={{ color: theme.brightBlack }}>total 128</div>
              <div>
                <span style={{ color: theme.cyan }}>drwxr-xr-x</span>  12 user staff   384 Sep 22 14:15 <span style={{ color: theme.blue, fontWeight: "bold" }}>.</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>drwxr-xr-x</span>  48 user staff  1536 Sep 22 12:00 <span style={{ color: theme.blue, fontWeight: "bold" }}>..</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>-rw-r--r--</span>   1 user staff  2841 Sep 22 15:30 <span style={{ color: theme.yellow }}>package.json</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>-rw-r--r--</span>   1 user staff  4109 Sep 22 15:31 <span style={{ color: theme.yellow }}>Cargo.toml</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>drwxr-xr-x</span>   8 user staff   256 Sep 22 14:20 <span style={{ color: theme.blue, fontWeight: "bold" }}>src</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>-rwxr-xr-x</span>   1 user staff 18920 Sep 22 14:35 <span style={{ color: theme.green, fontWeight: "bold" }}>run_daemon.sh</span>
              </div>
              <div>
                <span style={{ color: theme.cyan }}>-rw-r--r--</span>   1 user staff 84210 Sep 22 15:00 <span style={{ color: theme.red }}>archive.tar.gz</span>
              </div>
              <br />
              <div>
                <span style={{ color: theme.green, fontWeight: "bold" }}>user@theia-macbook</span>
                <span style={{ color: theme.white }}>:</span>
                <span style={{ color: theme.blue, fontWeight: "bold" }}>~/workspace/theia</span>
                <span style={{ color: theme.magenta }}> (main*)</span>
                <span style={{ color: theme.foreground }}> $ git status</span>
              </div>
              <div><span style={{ color: theme.brightGreen }}>✓ On branch main</span></div>
              <div><span style={{ color: theme.brightCyan }}>Your branch is up to date with 'origin/main'.</span></div>
              <div><span style={{ color: theme.brightYellow }}>Changes not staged for commit:</span></div>
              <div>  <span style={{ color: theme.brightRed }}>modified: src/themes.ts</span></div>
              <div>  <span style={{ color: theme.brightRed }}>modified: src/components/ThemeEditorModal.tsx</span></div>
              <br />
              <div>
                <span style={{ color: theme.green, fontWeight: "bold" }}>user@theia-macbook</span>
                <span style={{ color: theme.white }}>:</span>
                <span style={{ color: theme.blue, fontWeight: "bold" }}>~/workspace/theia</span>
                <span style={{ color: theme.magenta }}> (main*)</span>
                <span style={{ color: theme.foreground }}> $ </span>
                <span
                  style={{
                    backgroundColor: theme.cursor,
                    color: theme.background,
                    padding: "0 2px",
                    borderRadius: "1px",
                  }}
                >
                  &nbsp;
                </span>
              </div>
            </div>

            {/* Quick Import / Export Tools */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleExportJson}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} /> Export JSON
                </button>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={13} /> Import JSON
                  <input type="file" accept=".json" onChange={handleImportJson} style={{ display: "none" }} />
                </label>
              </div>

              {theme.isCustom && (
                <button
                  onClick={handleDelete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: confirmDelete ? "rgba(244, 63, 94, 0.3)" : "rgba(244, 63, 94, 0.1)",
                    border: confirmDelete ? "1px solid #f43f5e" : "1px solid rgba(244, 63, 94, 0.25)",
                    color: "#fda4af",
                    fontSize: "11px",
                    fontWeight: confirmDelete ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} /> {confirmDelete ? "Confirm Delete?" : "Delete Theme"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "12px 22px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.7)",
            gap: "10px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 20px",
              borderRadius: "6px",
              background: saveSuccess ? "#10b981" : "#06b6d4",
              border: "none",
              color: "#080c14",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)",
            }}
          >
            {saveSuccess ? <Check size={14} /> : <Save size={14} />}
            <span>{saveSuccess ? "Saved & Applied!" : "Save & Apply Theme"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

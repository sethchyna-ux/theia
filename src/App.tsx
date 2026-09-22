import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { SplitPaneManager } from "./components/SplitPaneManager";
import { SftpExplorer } from "./components/SftpExplorer";
import { TunnelManager } from "./components/TunnelManager";
import { SnippetLibrary } from "./components/SnippetLibrary";
import { KeyVault } from "./components/KeyVault";
import { ResourceMonitor } from "./components/ResourceMonitor";
import { HostModal } from "./components/HostModal";
import { CommandPalette } from "./components/CommandPalette";
import { SettingsModal } from "./components/SettingsModal";
import { ActiveView, HostConfig, SessionTab, SplitLayout } from "./types";
import {
  MONOSPACE_FONTS,
  getStoredFontId,
  getStoredFontSize,
  getStoredVibrancy,
} from "./fonts";

export const App: React.FC = () => {
  // Navigation & View State
  const [activeView, setActiveView] = useState<ActiveView>("terminal");
  const [hosts, setHosts] = useState<HostConfig[]>([]);

  // Sessions and Layout State
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitLayout, setSplitLayout] = useState<SplitLayout>("single");
  const [broadcastMode, setBroadcastMode] = useState<boolean>(false);
  const [hudVisible, setHudVisible] = useState<boolean>(true);

  // Host modal state
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<HostConfig | null>(null);

  // Command palette state (Spotlight / Raycast style ⌘K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Terminal Theme state (Obsidian, Catppuccin, Tokyo Night, Dracula, Nord, Matrix)
  const [terminalTheme, setTerminalTheme] = useState<string>("obsidian");

  // Font & Preferences state
  const [fontId, setFontId] = useState<string>(getStoredFontId());
  const [fontSize, setFontSize] = useState<number>(getStoredFontSize());
  const [vibrancyEnabled, setVibrancyEnabled] = useState<boolean>(getStoredVibrancy());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load all hosts on startup
  const refreshHosts = async () => {
    try {
      const data = await invoke<HostConfig[]>("get_hosts");
      setHosts(data);
    } catch (err) {
      console.error("Failed to load hosts:", err);
      // Fallback local bookmarks
      setHosts([
        {
          id: "host_local",
          name: "Localhost Development",
          hostname: "127.0.0.1",
          port: 22,
          user: "yocan",
          identity_file: "~/.ssh/id_ed25519",
          group: "Local",
          tags: ["local", "dev"],
          source: "bookmark",
        },
        {
          id: "host_prod_db",
          name: "US-East Production Database",
          hostname: "10.0.4.15",
          port: 2222,
          user: "postgres",
          identity_file: "~/.ssh/id_rsa_legacy",
          group: "Production",
          tags: ["db", "prod", "east"],
          source: "bookmark",
        },
        {
          id: "host_k8s_worker",
          name: "K8s Worker Node 01",
          hostname: "10.0.12.8",
          port: 22,
          user: "ubuntu",
          identity_file: "~/.ssh/id_ed25519",
          group: "Production",
          tags: ["k8s", "gpu"],
          source: "bookmark",
        },
      ]);
    }
  };

  // Spawn a native macOS PTY terminal tab (zsh)
  const handleNewLocalTab = () => {
    const sessionId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const localHost: HostConfig = {
      id: sessionId,
      name: "Local Terminal",
      hostname: "localhost",
      port: 0,
      source: "local",
      tags: ["local", "zsh"],
    };

    const newTab: SessionTab = {
      id: sessionId,
      host: localHost,
      title: "Local (zsh)",
      connected: true,
      active: true,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(sessionId);
    setActiveView("terminal");
  };

  // Start with hosts loaded and an initial local terminal tab
  useEffect(() => {
    refreshHosts();
    handleNewLocalTab();
  }, []);

  // Listen for macOS System Tray Quick-Connect and new terminal events
  useEffect(() => {
    const unlistenTrayHostPromise = listen<string>("tray-connect-host", (event) => {
      const hostId = event.payload;
      const target = hosts.find((h) => h.id === hostId);
      if (target) {
        handleConnectHost(target);
      }
    });

    const unlistenTrayTermPromise = listen("tray-new-terminal", () => {
      handleNewLocalTab();
    });

    return () => {
      unlistenTrayHostPromise.then((unlisten) => unlisten());
      unlistenTrayTermPromise.then((unlisten) => unlisten());
    };
  }, [hosts]);

  // Native macOS keyboard shortcuts: ⌘T, ⌘W, ⌘K, ⌘B, ⌘H, ⌘,, ⌘1-9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;

      if (e.key.toLowerCase() === "t" && !e.shiftKey) {
        e.preventDefault();
        handleNewLocalTab();
      } else if (e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        setEditingHost(null);
        setIsHostModalOpen(true);
      } else if (e.key.toLowerCase() === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
      } else if (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "," && !e.shiftKey) {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === "b" && !e.shiftKey) {
        e.preventDefault();
        setBroadcastMode((prev) => !prev);
      } else if (e.key.toLowerCase() === "h" && !e.shiftKey) {
        e.preventDefault();
        setHudVisible((prev) => !prev);
      } else if (e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSplitLayout("vertical");
        setActiveView("terminal");
      } else if (e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setSplitLayout("horizontal");
        setActiveView("terminal");
      } else if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveTabId(tabs[idx].id);
          setActiveView("terminal");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, activeTabId]);

  // Connect to host and create session tab
  const handleConnectHost = (host: HostConfig) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTab: SessionTab = {
      id: sessionId,
      host,
      title: host.name,
      connected: true,
      active: true,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(sessionId);
    setActiveView("terminal");
  };

  // Close session tab
  const handleCloseTab = async (id: string) => {
    try {
      await invoke("ssh_disconnect", { sessionId: id });
    } catch (_) {}

    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  // Broadcast input across all open tabs
  const handleBroadcastInput = async (data: string) => {
    for (const tab of tabs) {
      try {
        await invoke("ssh_send_data", { sessionId: tab.id, data });
      } catch (err) {
        console.error(`Failed broadcast to ${tab.id}:`, err);
      }
    }
  };

  // Execute snippet directly into terminal tab(s)
  const handleExecuteSnippet = async (command: string, broadcast: boolean) => {
    const formatted = command.endsWith("\n") ? command : `${command}\n`;

    if (broadcast || broadcastMode) {
      handleBroadcastInput(formatted);
    } else if (activeTabId) {
      try {
        await invoke("ssh_send_data", { sessionId: activeTabId, data: formatted });
      } catch (err) {
        console.error("Failed to send snippet data:", err);
      }
    }
    setActiveView("terminal");
  };

  // Save host from modal
  const handleSaveHost = async (host: HostConfig, connectImmediately: boolean) => {
    try {
      await invoke("save_host", { host });
      await refreshHosts();
      setIsHostModalOpen(false);
      setEditingHost(null);

      if (connectImmediately) {
        handleConnectHost(host);
      }
    } catch (err) {
      console.error("Failed to save host:", err);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const currentFont = MONOSPACE_FONTS.find((f) => f.id === fontId) || MONOSPACE_FONTS[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        backgroundColor: vibrancyEnabled ? "rgba(8, 12, 20, 0.78)" : "#080c14",
        backdropFilter: vibrancyEnabled ? "blur(20px)" : "none",
        overflow: "hidden",
      }}
    >
      {/* Top Titlebar with macOS traffic light spacing & session controls */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setActiveView("terminal");
        }}
        onCloseTab={handleCloseTab}
        onNewLocalTab={handleNewLocalTab}
        onNewConnection={() => {
          setEditingHost(null);
          setIsHostModalOpen(true);
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        themeId={terminalTheme}
        onChangeTheme={setTerminalTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        broadcastMode={broadcastMode}
        onToggleBroadcast={() => setBroadcastMode(!broadcastMode)}
        hudVisible={hudVisible}
        onToggleHud={() => setHudVisible(!hudVisible)}
        splitLayout={splitLayout}
        onChangeSplitLayout={setSplitLayout}
      />

      {/* Main Workspace (Sidebar + Center Content) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          activeView={activeView}
          onChangeView={setActiveView}
          hosts={hosts}
          onConnectHost={handleConnectHost}
          onOpenNewHostModal={() => {
            setEditingHost(null);
            setIsHostModalOpen(true);
          }}
        />

        {/* Center Canvas */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: vibrancyEnabled ? "rgba(8, 12, 20, 0.65)" : "#080c14",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {activeView === "terminal" && (
            <>
              {/* Telemetry HUD */}
              <ResourceMonitor
                visible={hudVisible && tabs.length > 0}
                onClose={() => setHudVisible(false)}
                hostname={activeTab?.host.name}
              />
              {/* Terminal Split Panes */}
              <div style={{ flex: 1, height: "100%", width: "100%", overflow: "hidden" }}>
                <SplitPaneManager
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={handleCloseTab}
                  splitLayout={splitLayout}
                  broadcastMode={broadcastMode}
                  onBroadcastInput={handleBroadcastInput}
                  themeId={terminalTheme}
                  fontFamily={currentFont.fontFamily}
                  fontSize={fontSize}
                />
              </div>
            </>
          )}

          {activeView === "sftp" && (
            <SftpExplorer tabs={tabs} activeTabId={activeTabId} />
          )}

          {activeView === "tunnels" && <TunnelManager />}

          {activeView === "snippets" && (
            <SnippetLibrary
              onExecuteSnippet={handleExecuteSnippet}
            />
          )}

          {activeView === "vault" && <KeyVault />}
        </main>
      </div>

      {/* New / Edit Host Modal */}
      <HostModal
        isOpen={isHostModalOpen}
        onClose={() => {
          setIsHostModalOpen(false);
          setEditingHost(null);
        }}
        onSave={handleSaveHost}
        existingHost={editingHost}
        allHosts={hosts}
      />

      {/* Spotlight / Raycast Style Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        hosts={hosts}
        onConnectHost={handleConnectHost}
        onNewLocalTab={handleNewLocalTab}
        onChangeView={setActiveView}
        onToggleBroadcast={() => setBroadcastMode(!broadcastMode)}
        broadcastMode={broadcastMode}
        onToggleHud={() => setHudVisible(!hudVisible)}
        hudVisible={hudVisible}
        onChangeSplitLayout={setSplitLayout}
        onExecuteSnippet={handleExecuteSnippet}
        onChangeTheme={setTerminalTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onChangeFont={setFontId}
        onToggleVibrancy={() => {
          const next = !vibrancyEnabled;
          setVibrancyEnabled(next);
          invoke("set_window_vibrancy", { enabled: next }).catch(() => {});
        }}
      />

      {/* macOS Preferences / Settings Modal (⌘,) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentFontId={fontId}
        onFontChange={setFontId}
        currentFontSize={fontSize}
        onFontSizeChange={setFontSize}
        vibrancyEnabled={vibrancyEnabled}
        onVibrancyChange={(enabled) => {
          setVibrancyEnabled(enabled);
        }}
      />
    </div>
  );
};

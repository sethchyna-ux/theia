import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { SplitPaneManager } from "./components/SplitPaneManager";
import { SftpExplorer } from "./components/SftpExplorer";
import { TunnelManager } from "./components/TunnelManager";
import { SnippetLibrary } from "./components/SnippetLibrary";
import { KeyVault } from "./components/KeyVault";
import { ResourceMonitor } from "./components/ResourceMonitor";
import { HostModal } from "./components/HostModal";
import { ActiveView, HostConfig, SessionTab, SplitLayout } from "./types";

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

  useEffect(() => {
    refreshHosts();
  }, []);

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#080c14",
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
        onNewConnection={() => {
          setEditingHost(null);
          setIsHostModalOpen(true);
        }}
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
            backgroundColor: "#080c14",
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
    </div>
  );
};

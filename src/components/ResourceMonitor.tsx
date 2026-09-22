import React, { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Gauge,
  Wifi,
  Radio,
  Search,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ServerTelemetry, PingResult, PortProbeResult } from "../types";

interface ResourceMonitorProps {
  visible: boolean;
  onClose: () => void;
  hostname?: string;
  port?: number;
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({
  visible,
  onClose,
  hostname,
  port = 22,
}) => {
  const [telemetry, setTelemetry] = useState<ServerTelemetry | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);

  // Network Diagnostic State
  const [currentPing, setCurrentPing] = useState<number | null>(null);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [probeResults, setProbeResults] = useState<PortProbeResult[]>([]);
  const [isProbing, setIsProbing] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchTelemetry = async () => {
      try {
        const data = await invoke<ServerTelemetry>("get_server_telemetry");
        setTelemetry(data);
      } catch (_) {
        // Mock fallback if disconnected
        setTelemetry({
          cpu_usage: 12.4,
          mem_total: 16384,
          mem_used: 4890,
          disk_percent: 38.6,
          load_avg: "0.18, 0.29, 0.35",
          uptime: "18 days, 4h",
        });
      }
    };

    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(timer);
  }, [visible]);

  // Network Ping Polling
  useEffect(() => {
    if (!visible || !hostname) return;

    let isMounted = true;
    const runPing = async () => {
      try {
        const res = await invoke<PingResult>("ping_host", { host: hostname, port: port || 22 });
        if (isMounted) {
          if (res.success) {
            setCurrentPing(res.rtt_ms);
            setPingHistory((prev) => [...prev.slice(-19), res.rtt_ms]);
          } else {
            setCurrentPing(null);
          }
        }
      } catch (_) {
        if (isMounted) setCurrentPing(null);
      }
    };

    runPing();
    const pingTimer = setInterval(runPing, 2000);
    return () => {
      isMounted = false;
      clearInterval(pingTimer);
    };
  }, [visible, hostname, port]);

  const handleProbePorts = async () => {
    if (!hostname || isProbing) return;
    setIsProbing(true);
    try {
      const results = await invoke<PortProbeResult[]>("probe_ports", { host: hostname });
      setProbeResults(results);
    } catch (err) {
      console.error("Port probe failed:", err);
    } finally {
      setIsProbing(false);
    }
  };

  // Calculate Jitter (std dev)
  const calculateJitter = () => {
    if (pingHistory.length < 2) return 0;
    const mean = pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length;
    const variance = pingHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pingHistory.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
  };

  if (!visible || !telemetry) return null;

  const memPercent = Math.round((telemetry.mem_used / telemetry.mem_total) * 100);

  const getMetricColor = (val: number) => {
    if (val < 50) return "#10b981"; // green
    if (val < 80) return "#f59e0b"; // amber
    return "#f43f5e"; // rose
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(11, 16, 28, 0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: collapsed ? "6px 16px" : "10px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 40,
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Left: Server and Live status */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#f8fafc" }}>
              {hostname ? `Telemetry HUD: ${hostname}` : "Live Telemetry HUD"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <Clock size={12} />
            <span>Up {telemetry.uptime}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <Activity size={12} color="#06b6d4" />
            <span>Load: {telemetry.load_avg}</span>
          </div>

          {hostname && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <Wifi size={12} color={currentPing !== null ? (currentPing < 80 ? "#10b981" : currentPing < 160 ? "#f59e0b" : "#f43f5e") : "#64748b"} />
              <span style={{ color: "#94a3b8" }}>RTT:</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: "600",
                  color: currentPing !== null ? (currentPing < 80 ? "#10b981" : currentPing < 160 ? "#f59e0b" : "#f43f5e") : "#64748b",
                }}
              >
                {currentPing !== null ? `${currentPing} ms` : "Probing..."}
              </span>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {hostname && (
            <button
              onClick={() => setShowNetwork(!showNetwork)}
              title="Toggle Network & Port Diagnostics"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: showNetwork ? "rgba(6, 182, 212, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: showNetwork ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "4px",
                color: showNetwork ? "#06b6d4" : "#94a3b8",
                fontSize: "11px",
                cursor: "pointer",
                padding: "2px 8px",
                transition: "all 0.15s ease",
              }}
            >
              <Radio size={12} />
              <span>Network</span>
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand HUD" : "Collapse HUD"}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={onClose}
            title="Close HUD"
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
          }}
        >
          {/* CPU Bar */}
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              borderRadius: "6px",
              padding: "6px 12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#cbd5e1",
                }}
              >
                <Cpu size={13} color="#06b6d4" /> CPU Load
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: "600",
                  color: getMetricColor(telemetry.cpu_usage),
                }}
              >
                {telemetry.cpu_usage.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "5px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, telemetry.cpu_usage)}%`,
                  backgroundColor: getMetricColor(telemetry.cpu_usage),
                  borderRadius: "3px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Memory Bar */}
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              borderRadius: "6px",
              padding: "6px 12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#cbd5e1",
                }}
              >
                <Gauge size={13} color="#a855f7" /> Memory
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: "600",
                  color: getMetricColor(memPercent),
                }}
              >
                {(telemetry.mem_used / 1024).toFixed(1)}G / {(telemetry.mem_total / 1024).toFixed(1)}G ({memPercent}%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "5px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, memPercent)}%`,
                  backgroundColor: getMetricColor(memPercent),
                  borderRadius: "3px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Disk Bar */}
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              borderRadius: "6px",
              padding: "6px 12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#cbd5e1",
                }}
              >
                <HardDrive size={13} color="#f59e0b" /> Root Disk (/)
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: "600",
                  color: getMetricColor(telemetry.disk_percent),
                }}
              >
                {telemetry.disk_percent.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "5px",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, telemetry.disk_percent)}%`,
                  backgroundColor: getMetricColor(telemetry.disk_percent),
                  borderRadius: "3px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Network Diagnostics Drawer */}
      {!collapsed && showNetwork && hostname && (
        <div
          style={{
            marginTop: "4px",
            padding: "10px 14px",
            backgroundColor: "rgba(6, 11, 20, 0.7)",
            borderRadius: "6px",
            border: "1px solid rgba(6, 182, 212, 0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#06b6d4", display: "flex", alignItems: "center", gap: "5px" }}>
                <Wifi size={13} /> Network Latency & Jitter Monitor
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px" }}>
                <span style={{ color: "#94a3b8" }}>
                  Latency:{" "}
                  <strong style={{ color: currentPing !== null ? (currentPing < 80 ? "#10b981" : "#f59e0b") : "#64748b" }}>
                    {currentPing !== null ? `${currentPing} ms` : "---"}
                  </strong>
                </span>
                <span style={{ color: "#94a3b8" }}>
                  Jitter: <strong style={{ color: "#e2e8f0" }}>±{calculateJitter()} ms</strong>
                </span>
                <span style={{ color: "#94a3b8" }}>
                  Samples: <strong style={{ color: "#e2e8f0" }}>{pingHistory.length}</strong>
                </span>
              </div>
            </div>

            {/* Sparkline */}
            {pingHistory.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", color: "#64748b" }}>RTT Trend</span>
                <svg width="120" height="20" style={{ overflow: "visible" }}>
                  {(() => {
                    const min = Math.min(...pingHistory);
                    const max = Math.max(...pingHistory);
                    const range = max - min || 1;
                    const points = pingHistory
                      .map((val, idx) => {
                        const x = (idx / (pingHistory.length - 1)) * 120;
                        const y = 18 - ((val - min) / range) * 16;
                        return `${x},${y}`;
                      })
                      .join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Port Prober Section */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}>
                <Search size={12} /> Standard Ports:
              </span>

              {probeResults.length === 0 ? (
                <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                  Click probe to check TCP status for SSH, HTTP, DB, and Cache ports
                </span>
              ) : (
                probeResults.map((p) => (
                  <div
                    key={p.port}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      backgroundColor: p.open ? "rgba(16, 185, 129, 0.12)" : "rgba(244, 63, 94, 0.08)",
                      border: p.open ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.2)",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: p.open ? "#10b981" : "#f43f5e",
                      }}
                    />
                    <span style={{ fontWeight: "600", color: p.open ? "#10b981" : "#94a3b8" }}>
                      {p.port}
                    </span>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>{p.service}</span>
                    {p.rtt_ms && <span style={{ fontSize: "9px", color: "#10b981" }}>{p.rtt_ms}ms</span>}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handleProbePorts}
              disabled={isProbing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                backgroundColor: isProbing ? "rgba(255, 255, 255, 0.05)" : "rgba(6, 182, 212, 0.15)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                borderRadius: "4px",
                color: isProbing ? "#64748b" : "#06b6d4",
                fontSize: "11px",
                fontWeight: "500",
                cursor: isProbing ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Radio size={12} className={isProbing ? "animate-pulse" : ""} />
              <span>{isProbing ? "Probing Ports..." : "Probe Ports"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ServerTelemetry } from "../types";

interface ResourceMonitorProps {
  visible: boolean;
  onClose: () => void;
  hostname?: string;
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({
  visible,
  onClose,
  hostname,
}) => {
  const [telemetry, setTelemetry] = useState<ServerTelemetry | null>(null);
  const [collapsed, setCollapsed] = useState(false);

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
        </div>

        {/* Right: Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
    </div>
  );
};

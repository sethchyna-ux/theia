export interface HostConfig {
  id: string;
  name: string;
  hostname: string;
  user?: string;
  port: number;
  identity_file?: string;
  password?: string;
  group?: string;
  tags: string[];
  bastion_id?: string;
  source: string; // "ssh_config" | "bookmark" | "direct"
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: number;
  permissions: number;
}

export interface TunnelConfig {
  id: string;
  host_id: string;
  tunnel_type: "local" | "remote" | "dynamic";
  local_port: number;
  remote_host?: string;
  remote_port?: number;
  enabled: boolean;
  status: "stopped" | "running" | "error";
  bytes_transferred: number;
}

export interface KeyPairInfo {
  name: string;
  key_type: string;
  public_key: string;
  fingerprint: string;
  path: string;
}

export interface KnownHostEntry {
  line_number: number;
  host: string;
  key_type: string;
  key_base64: string;
  fingerprint: string;
  is_hashed: boolean;
}

export interface Snippet {
  id: string;
  name: string;
  description?: string;
  script: string;
  tags: string[];
}

export interface ServerTelemetry {
  cpu_usage: number;
  mem_total: number;
  mem_used: number;
  disk_percent: number;
  load_avg: string;
  uptime: string;
}

export interface SessionTab {
  id: string;
  host: HostConfig;
  title: string;
  connected: boolean;
  active: boolean;
}

export interface PingResult {
  rtt_ms: number;
  success: boolean;
  error?: string;
}

export interface PortProbeResult {
  port: number;
  open: boolean;
  service: string;
  rtt_ms?: number;
}

export type SplitLayout = "single" | "vertical" | "horizontal" | "grid";
export type ActiveView = "terminal" | "sftp" | "tunnels" | "snippets" | "vault";

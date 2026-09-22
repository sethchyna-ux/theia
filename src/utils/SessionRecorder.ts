export interface RecordedEvent {
  time: number; // offset in seconds from start
  type: "o" | "i"; // 'o' for stdout output, 'i' for stdin
  data: string;
}

export interface RecordedSession {
  id: string;
  title: string;
  timestamp: number;
  duration: number;
  cols: number;
  rows: number;
  events: RecordedEvent[];
}

export class SessionRecorder {
  private isRecording = false;
  private startTime = 0;
  private cols = 80;
  private rows = 24;
  private title = "Theia Terminal Session";
  private events: RecordedEvent[] = [];

  start(cols: number = 80, rows: number = 24, title: string = "Theia Session") {
    this.isRecording = true;
    this.startTime = performance.now();
    this.cols = cols;
    this.rows = rows;
    this.title = title;
    this.events = [];
  }

  recordData(data: string, type: "o" | "i" = "o") {
    if (!this.isRecording) return;
    const now = performance.now();
    const time = parseFloat(((now - this.startTime) / 1000).toFixed(4));
    this.events.push({ time, type, data });
  }

  stop(): RecordedSession | null {
    if (!this.isRecording) return null;
    this.isRecording = false;
    const duration = parseFloat(((performance.now() - this.startTime) / 1000).toFixed(2));

    const session: RecordedSession = {
      id: `rec_${Date.now()}`,
      title: this.title,
      timestamp: Math.floor(Date.now() / 1000),
      duration,
      cols: this.cols,
      rows: this.rows,
      events: [...this.events],
    };

    return session;
  }

  get active(): boolean {
    return this.isRecording;
  }

  get elapsedSeconds(): number {
    if (!this.isRecording) return 0;
    return Math.floor((performance.now() - this.startTime) / 1000);
  }
}

/**
 * Format session as standard Asciinema v2 (.cast) format.
 * Line 1 is header JSON. Subsequent lines are JSON arrays [time, type, data].
 */
export function formatAsciinemaCast(session: RecordedSession): string {
  const header = JSON.stringify({
    version: 2,
    width: session.cols,
    height: session.rows,
    timestamp: session.timestamp,
    title: session.title,
    env: {
      TERM: "xterm-256color",
      SHELL: "/bin/zsh",
    },
  });

  const lines = [header];
  for (const ev of session.events) {
    lines.push(JSON.stringify([ev.time, ev.type, ev.data]));
  }

  return lines.join("\n");
}

/**
 * Format session as raw plain text with ANSI color codes stripped or preserved.
 */
export function formatPlainText(session: RecordedSession, stripAnsi: boolean = true): string {
  let combined = session.events
    .filter((e) => e.type === "o")
    .map((e) => e.data)
    .join("");

  if (stripAnsi) {
    // Strip ANSI escape codes
    combined = combined.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
  }

  return combined;
}

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Video,
  FileText,
} from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  RecordedSession,
  formatAsciinemaCast,
  formatPlainText,
} from "../utils/SessionRecorder";
import { TERMINAL_THEMES } from "../themes";

interface SessionReplayModalProps {
  session: RecordedSession | null;
  isOpen: boolean;
  onClose: () => void;
  themeId?: string;
}

export const SessionReplayModal: React.FC<SessionReplayModalProps> = ({
  session,
  isOpen,
  onClose,
  themeId = "obsidian",
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const playIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const virtualTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen || !session || !terminalRef.current) return;

    const termTheme = TERMINAL_THEMES[themeId] || TERMINAL_THEMES.obsidian;

    const term = new Terminal({
      cols: session.cols || 80,
      rows: session.rows || 24,
      theme: termTheme,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      fontSize: 12,
      disableStdin: true,
      cursorBlink: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Reset playback
    term.clear();
    playIndexRef.current = 0;
    virtualTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
    playStartTimeRef.current = performance.now();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      term.dispose();
      xtermInstance.current = null;
    };
  }, [isOpen, session]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying || !session || !xtermInstance.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTick = performance.now();

    const tick = (now: number) => {
      const deltaMs = now - lastTick;
      lastTick = now;

      // Advance virtual time by delta * speed
      const newVirtualTime = virtualTimeRef.current + (deltaMs / 1000) * playbackSpeed;
      virtualTimeRef.current = newVirtualTime;
      setCurrentTime(Math.min(newVirtualTime, session.duration));

      // Play any events up to newVirtualTime
      const term = xtermInstance.current;
      while (
        playIndexRef.current < session.events.length &&
        session.events[playIndexRef.current].time <= newVirtualTime
      ) {
        const ev = session.events[playIndexRef.current];
        if (term && ev.type === "o") {
          term.write(ev.data);
        }
        playIndexRef.current++;
      }

      if (playIndexRef.current >= session.events.length || newVirtualTime >= session.duration) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, session]);

  if (!isOpen || !session) return null;

  const handleTogglePlay = () => {
    if (playIndexRef.current >= session.events.length) {
      // Reached the end, restart from beginning
      handleRestart();
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const handleRestart = () => {
    if (!xtermInstance.current) return;
    xtermInstance.current.reset();
    playIndexRef.current = 0;
    virtualTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleSeek = (targetTime: number) => {
    if (!xtermInstance.current) return;
    xtermInstance.current.reset();
    virtualTimeRef.current = targetTime;
    setCurrentTime(targetTime);

    // Replay all events up to targetTime instantly
    let i = 0;
    while (i < session.events.length && session.events[i].time <= targetTime) {
      const ev = session.events[i];
      if (ev.type === "o") {
        xtermInstance.current.write(ev.data);
      }
      i++;
    }
    playIndexRef.current = i;
  };

  const handleDownloadCast = () => {
    const castData = formatAsciinemaCast(session);
    const blob = new Blob([castData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.id}_theia_recording.cast`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const textData = formatPlainText(session, true);
    const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.id}_theia_output.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = () => {
    const textData = formatPlainText(session, true);
    navigator.clipboard.writeText(textData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
      }}
    >
      <div
        style={{
          width: "880px",
          height: "600px",
          backgroundColor: "#0a0f1d",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Video size={18} color="#f43f5e" />
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                Session Recording Playback: {session.title}
              </h2>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {session.events.length} captured terminal events • Duration: {formatSecs(session.duration)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handleCopyLog}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>

            <button
              onClick={handleDownloadCast}
              title="Download standard Asciinema v2 (.cast) file"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fda4af",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download size={13} />
              <span>.cast</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              title="Download plain text output"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#cbd5e1",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              <FileText size={13} />
              <span>.txt</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", marginLeft: "6px" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Replay Terminal Canvas */}
        <div
          ref={terminalRef}
          style={{
            flex: 1,
            padding: "12px",
            backgroundColor: "#080c14",
            overflow: "hidden",
          }}
        />

        {/* Player Controls Bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "12px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 23, 42, 0.9)",
            gap: "8px",
          }}
        >
          {/* Scrubber slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#cbd5e1", width: "42px" }}>
              {formatSecs(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={session.duration || 1}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: "pointer",
                accentColor: "#f43f5e",
              }}
            />
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#64748b", width: "42px" }}>
              {formatSecs(session.duration)}
            </span>
          </div>

          {/* Controls: Play/Pause, Restart, Speed */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handleTogglePlay}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isPlaying ? "#f43f5e" : "#06b6d4",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {isPlaying ? <Pause size={15} fill="#ffffff" /> : <Play size={15} fill="#ffffff" style={{ marginLeft: "2px" }} />}
              </button>

              <button
                onClick={handleRestart}
                title="Restart playback"
                style={{
                  padding: "6px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  color: "#cbd5e1",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={14} />
              </button>

              {/* Speed buttons */}
              <div style={{ display: "flex", gap: "4px", marginLeft: "10px" }}>
                {[1, 1.5, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: playbackSpeed === spd ? "#06b6d4" : "rgba(255, 255, 255, 0.1)",
                      backgroundColor: playbackSpeed === spd ? "rgba(6, 182, 212, 0.2)" : "transparent",
                      color: playbackSpeed === spd ? "#22d3ee" : "#64748b",
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: "11px", color: "#64748b" }}>
              Asciinema v2 Format • Theia Terminal Recorder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

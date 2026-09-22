export interface TerminalTheme {
  id: string;
  name: string;
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  isCustom?: boolean;
}

export const BUILTIN_THEMES: Record<string, TerminalTheme> = {
  obsidian: {
    id: "obsidian",
    name: "Obsidian Slate",
    background: "#080c14",
    foreground: "#f1f5f9",
    cursor: "#06b6d4",
    selectionBackground: "rgba(6, 182, 212, 0.3)",
    black: "#0b0f19",
    red: "#f43f5e",
    green: "#10b981",
    yellow: "#f59e0b",
    blue: "#3b82f6",
    magenta: "#d946ef",
    cyan: "#06b6d4",
    white: "#f8fafc",
    brightBlack: "#475569",
    brightRed: "#fb7185",
    brightGreen: "#34d399",
    brightYellow: "#fbbf24",
    brightBlue: "#60a5fa",
    brightMagenta: "#e879f9",
    brightCyan: "#22d3ee",
    brightWhite: "#ffffff",
  },
  catppuccin: {
    id: "catppuccin",
    name: "Catppuccin Macchiato",
    background: "#24273a",
    foreground: "#cad3f5",
    cursor: "#f5bde6",
    selectionBackground: "rgba(245, 189, 230, 0.25)",
    black: "#494d64",
    red: "#ed8796",
    green: "#a6da95",
    yellow: "#eed49f",
    blue: "#8aadf4",
    magenta: "#f5bde6",
    cyan: "#8bd5ca",
    white: "#b8c0e0",
    brightBlack: "#5b6078",
    brightRed: "#ed8796",
    brightGreen: "#a6da95",
    brightYellow: "#eed49f",
    brightBlue: "#8aadf4",
    brightMagenta: "#f5bde6",
    brightCyan: "#8bd5ca",
    brightWhite: "#a5adcb",
  },
  tokyoNight: {
    id: "tokyoNight",
    name: "Tokyo Night",
    background: "#1a1b26",
    foreground: "#c0caf5",
    cursor: "#7aa2f7",
    selectionBackground: "rgba(122, 162, 247, 0.3)",
    black: "#15161e",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#bb9af7",
    cyan: "#7dcfff",
    white: "#a9b1d6",
    brightBlack: "#414868",
    brightRed: "#f7768e",
    brightGreen: "#9ece6a",
    brightYellow: "#e0af68",
    brightBlue: "#7aa2f7",
    brightMagenta: "#bb9af7",
    brightCyan: "#7dcfff",
    brightWhite: "#c0caf5",
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#bd93f9",
    selectionBackground: "rgba(189, 147, 249, 0.3)",
    black: "#21222c",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2",
    brightBlack: "#6272a4",
    brightRed: "#ff6e6e",
    brightGreen: "#69ff94",
    brightYellow: "#ffffa5",
    brightBlue: "#d6acff",
    brightMagenta: "#ff92df",
    brightCyan: "#a4ffff",
    brightWhite: "#ffffff",
  },
  nord: {
    id: "nord",
    name: "Nord Frost",
    background: "#2e3440",
    foreground: "#d8dee9",
    cursor: "#88c0d0",
    selectionBackground: "rgba(136, 192, 208, 0.3)",
    black: "#3b4252",
    red: "#bf616a",
    green: "#a3be8c",
    yellow: "#ebcb8b",
    blue: "#81a1c1",
    magenta: "#b48ead",
    cyan: "#88c0d0",
    white: "#e5e9f0",
    brightBlack: "#4c566a",
    brightRed: "#bf616a",
    brightGreen: "#a3be8c",
    brightYellow: "#ebcb8b",
    brightBlue: "#81a1c1",
    brightMagenta: "#b48ead",
    brightCyan: "#8fbcbb",
    brightWhite: "#eceff4",
  },
  solarizedDark: {
    id: "solarizedDark",
    name: "Solarized Dark",
    background: "#002b36",
    foreground: "#839496",
    cursor: "#2aa198",
    selectionBackground: "rgba(7, 54, 66, 0.5)",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
    brightBlack: "#586e75",
    brightRed: "#cb4b16",
    brightGreen: "#586e75",
    brightYellow: "#657b83",
    brightBlue: "#839496",
    brightMagenta: "#6c71c4",
    brightCyan: "#93a1a1",
    brightWhite: "#fdf6e3",
  },
  monokai: {
    id: "monokai",
    name: "Monokai Pro",
    background: "#2d2a2e",
    foreground: "#fcfcfa",
    cursor: "#ffd866",
    selectionBackground: "rgba(255, 216, 102, 0.25)",
    black: "#403e41",
    red: "#ff6188",
    green: "#a9dc76",
    yellow: "#ffd866",
    blue: "#78dce8",
    magenta: "#ab9df2",
    cyan: "#78dce8",
    white: "#fcfcfa",
    brightBlack: "#727072",
    brightRed: "#ff6188",
    brightGreen: "#a9dc76",
    brightYellow: "#ffd866",
    brightBlue: "#78dce8",
    brightMagenta: "#ab9df2",
    brightCyan: "#78dce8",
    brightWhite: "#ffffff",
  },
  synthwave: {
    id: "synthwave",
    name: "Synthwave '84",
    background: "#262335",
    foreground: "#f92aad",
    cursor: "#36f9f6",
    selectionBackground: "rgba(254, 68, 169, 0.3)",
    black: "#241b2f",
    red: "#fe4450",
    green: "#72f1b8",
    yellow: "#fede5d",
    blue: "#03edf9",
    magenta: "#ff7edb",
    cyan: "#03edf9",
    white: "#ffffff",
    brightBlack: "#614d85",
    brightRed: "#fe4450",
    brightGreen: "#72f1b8",
    brightYellow: "#fede5d",
    brightBlue: "#03edf9",
    brightMagenta: "#ff7edb",
    brightCyan: "#03edf9",
    brightWhite: "#ffffff",
  },
  matrix: {
    id: "matrix",
    name: "Matrix Green",
    background: "#020b05",
    foreground: "#22c55e",
    cursor: "#4ade80",
    selectionBackground: "rgba(34, 197, 94, 0.3)",
    black: "#05160b",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#84cc16",
    blue: "#10b981",
    magenta: "#14b8a6",
    cyan: "#34d399",
    white: "#86efac",
    brightBlack: "#14532d",
    brightRed: "#f87171",
    brightGreen: "#4ade80",
    brightYellow: "#a3e635",
    brightBlue: "#34d399",
    brightMagenta: "#2dd4bf",
    brightCyan: "#6ee7b7",
    brightWhite: "#bbf7d0",
  },
};

const CUSTOM_THEMES_STORAGE_KEY = "theia_custom_terminal_themes";

export function loadCustomThemes(): Record<string, TerminalTheme> {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

export function saveCustomTheme(theme: TerminalTheme): void {
  const current = loadCustomThemes();
  current[theme.id] = { ...theme, isCustom: true };
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(current));
  updateThemesRegistry();
}

export function deleteCustomTheme(id: string): void {
  const current = loadCustomThemes();
  delete current[id];
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(current));
  updateThemesRegistry();
}

export function getAllThemes(): Record<string, TerminalTheme> {
  const custom = loadCustomThemes();
  return { ...BUILTIN_THEMES, ...custom };
}

// Global active themes registry for xterm and components
export let TERMINAL_THEMES: Record<string, TerminalTheme> = { ...BUILTIN_THEMES, ...loadCustomThemes() };

export function updateThemesRegistry() {
  TERMINAL_THEMES = getAllThemes();
}

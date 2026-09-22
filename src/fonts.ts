export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  description: string;
}

export const MONOSPACE_FONTS: FontOption[] = [
  {
    id: 'sf-mono',
    name: 'SF Mono',
    fontFamily: '"SF Mono", SFMono-Regular, ui-monospace, Menlo, monospace',
    description: 'Apple macOS system native monospace font',
  },
  {
    id: 'menlo',
    name: 'Menlo',
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    description: 'macOS classic terminal monospace',
  },
  {
    id: 'monaco',
    name: 'Monaco',
    fontFamily: 'Monaco, Menlo, monospace',
    description: 'Classic retro macOS terminal font',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    fontFamily: '"JetBrains Mono", Menlo, monospace',
    description: 'Engineered for developer reading comfort',
  },
  {
    id: 'fira-code',
    name: 'Fira Code',
    fontFamily: '"Fira Code", Menlo, monospace',
    description: 'Clean coding ligature font',
  },
  {
    id: 'cascadia-code',
    name: 'Cascadia Code',
    fontFamily: '"Cascadia Code", Menlo, monospace',
    description: 'Modern terminal monospace',
  },
];

export const DEFAULT_FONT_ID = 'sf-mono';
export const DEFAULT_FONT_SIZE = 13;

export function getStoredFontId(): string {
  return localStorage.getItem('theia_font_id') || DEFAULT_FONT_ID;
}

export function setStoredFontId(id: string): void {
  localStorage.setItem('theia_font_id', id);
}

export function getStoredFontSize(): number {
  const val = localStorage.getItem('theia_font_size');
  return val ? parseInt(val, 10) : DEFAULT_FONT_SIZE;
}

export function setStoredFontSize(size: number): void {
  localStorage.setItem('theia_font_size', size.toString());
}

export function getStoredVibrancy(): boolean {
  const val = localStorage.getItem('theia_vibrancy_enabled');
  return val === null ? true : val === 'true';
}

export function setStoredVibrancy(enabled: boolean): void {
  localStorage.setItem('theia_vibrancy_enabled', enabled.toString());
}

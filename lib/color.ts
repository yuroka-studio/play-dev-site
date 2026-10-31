// Accent colour helpers. The accent is whatever the developer picks; these
// derive text colours that always meet WCAG AA (4.5:1) so axe stays green.

type Rgb = [number, number, number];

function parse(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Mixes `color` toward black by `amount` (0..1). */
function darken(color: string, amount: number): string {
  const [r, g, b] = parse(color);
  return toHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

const WHITE = "#ffffff";
const BLACK = "#000000";
/** The lightest background the accent text must read on (page tint and cards). */
const SURFACE = "#f3f5f6";

export interface AccentVars {
  /** The accent exactly as configured; fills and decoration. */
  accent: string;
  /** Text colour on top of an accent fill (buttons, chips). */
  onAccent: string;
  /** Accent darkened until it reads as text on the page backgrounds (links, headings accents). */
  accentInk: string;
}

export function accentVars(accent: string): AccentVars {
  const color = accent.toLowerCase();
  // black or white, whichever reads better: one of them is always above 4.5:1
  const onAccent = contrast(color, WHITE) >= contrast(color, BLACK) ? WHITE : BLACK;
  let ink = color;
  for (let step = 0; step < 40 && contrast(ink, SURFACE) < 4.8; step++) ink = darken(color, (step + 1) * 0.03);
  return { accent: color, onAccent, accentInk: ink };
}

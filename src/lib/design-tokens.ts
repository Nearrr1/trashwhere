/**
 * Design tokens as TypeScript constants.
 *
 * Keep in sync with globals.css `@theme inline` block.
 * A colour change requires updating BOTH files.
 *
 * Use only in JS contexts: animation libraries, canvas, dynamic styling.
 * For Tailwind utilities, use the CSS token classes (e.g., `bg-paper`, `text-ink`).
 */

export const tokens = {
  color: {
    paper:         "#f5f0e8",
    paperCard:     "#ede8dc",
    paperRule:     "#c8bfaa",
    paperHover:    "#e5dfd3",
    ink:           "#1c1c1c",
    inkSecondary:  "#5c5040",
    inkMuted:      "#9a8f7c",
    forest:        "#1a3a2a",
    forestHover:   "#142e21",
    amber:         "#c17f3e",
    amberLight:    "#f0e4d0",
    terra:         "#c25b3f",
  },

  category: {
    recyclable: { accent: "#2e7d52", tint: "#e4ede6" },
    organic:    { accent: "#7a5c2e", tint: "#edeae0" },
    hazardous:  { accent: "#c25b3f", tint: "#f0e4e0" },
    electronic: { accent: "#3a6078", tint: "#e0e8ed" },
    general:    { accent: "#5c5040", tint: "#eaeae8" },
    unknown:    { accent: "#9a8f7c", tint: "#f0ede4" },
  },

  /** Motion durations in milliseconds. */
  duration: {
    instant: 80,
    fast:    150,
    normal:  250,
    slow:    400,
    drawer:  320,
    stamp:   300,
  },

  /** CSS easing function strings for use with the Web Animations API. */
  easing: {
    outExpo:  "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut:    "cubic-bezier(0.4, 0, 0.2, 1)",
    spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  /** Spacing values in pixels (base unit: 4px). */
  spacing: {
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    5:  20,
    6:  24,
    8:  32,
    10: 40,
    12: 48,
    16: 64,
    24: 96,
  },

  /** Border radius values in pixels. */
  radius: {
    none: 0,
    sm:   3,
    md:   4,
    lg:   8,
    full: 9999,
  },
} as const;

export type TokenColor    = keyof typeof tokens.color;
export type TokenCategory = keyof typeof tokens.category;
export type TokenDuration = keyof typeof tokens.duration;
export type TokenEasing   = keyof typeof tokens.easing;

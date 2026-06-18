/**
 * Design tokens — single source of truth for CRM color system.
 *
 * Gray ramp: Tailwind Gray (most-used scale in the codebase).
 * Brand: Tailwind Indigo anchored at 600 (#4f46e5).
 */

/** Readonly hex color string */
export type HexColor = `#${string}`;

/** Numeric shade keys shared by ramps */
export type Shade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | 950;

export type ColorRamp = Readonly<Record<Shade, HexColor>>;

export type SemanticRole = "success" | "warning" | "error" | "info";

export type SemanticToken = Readonly<{
  /** Primary fill / icon / chart */
  DEFAULT: HexColor;
  /** Tinted backgrounds (KPI cards, highlights) */
  light: HexColor;
  /** Hover / pressed / dark text on light bg */
  dark: HexColor;
  /** Borders on tinted surfaces */
  border: HexColor;
}>;

export type TextTokens = Readonly<{
  primary: HexColor;
  secondary: HexColor;
  tertiary: HexColor;
  disabled: HexColor;
  inverse: HexColor;
  link: HexColor;
  linkHover: HexColor;
}>;

/** Tailwind Gray — neutral surfaces, borders, body copy hierarchy */
export const neutral = {
  50: "#f9fafb",
  100: "#f3f4f6",
  200: "#e5e7eb",
  300: "#d1d5db",
  400: "#9ca3af",
  500: "#6b7280",
  600: "#4b5563",
  700: "#374151",
  800: "#1f2937",
  900: "#111827",
  950: "#030712",
} as const satisfies ColorRamp;

/** Tailwind Indigo — brand primary and family */
export const brand = {
  DEFAULT: "#4f46e5",
  50: "#eef2ff",
  100: "#e0e7ff",
  200: "#c7d2fe",
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  800: "#3730a3",
  900: "#312e81",
  950: "#1e1b4b",
} as const;

export type BrandTokens = typeof brand;

/** Status / feedback colors */
export const semantic = {
  success: {
    DEFAULT: "#16a34a",
    light: "#f0fdf4",
    dark: "#15803d",
    border: "#bbf7d0",
  },
  warning: {
    DEFAULT: "#f59e0b",
    light: "#fffbeb",
    dark: "#b45309",
    border: "#fde68a",
  },
  error: {
    DEFAULT: "#ef4444",
    light: "#fef2f2",
    dark: "#b91c1c",
    border: "#fecaca",
  },
  info: {
    DEFAULT: "#0ea5e9",
    light: "#f0f9ff",
    dark: "#0369a1",
    border: "#bae6fd",
  },
} as const satisfies Readonly<Record<SemanticRole, SemanticToken>>;

export type SemanticTokens = typeof semantic;

/** Typography colors — mapped to neutral ramp + brand for links */
export const text = {
  primary: neutral[900],
  secondary: neutral[600],
  tertiary: neutral[500],
  disabled: neutral[400],
  inverse: "#ffffff",
  link: brand[600],
  linkHover: brand[700],
} as const satisfies TextTokens;

export type TextTokenKey = keyof typeof text;

/** Aggregate export for theme providers and runtime lookups */
export const tokens = {
  brand,
  semantic,
  neutral,
  text,
} as const;

export type DesignTokens = typeof tokens;

/** Ant Design `colorPrimary` and legacy CSS var aliases */
export const antdThemeColors = {
  colorPrimary: brand[600],
  colorSuccess: semantic.success.DEFAULT,
  colorWarning: semantic.warning.DEFAULT,
  colorError: semantic.error.DEFAULT,
  colorInfo: semantic.info.DEFAULT,
  colorText: text.primary,
  colorTextSecondary: text.secondary,
  colorTextTertiary: text.tertiary,
  colorBorder: neutral[200],
  colorBgLayout: neutral[100],
  colorBgContainer: text.inverse,
} as const;

/** CSS custom-property names (for globals.css / theme sync) */
export const cssVars = {
  crmPrimary: "--crm-primary",
  crmSuccess: "--crm-success",
  crmWarning: "--crm-warning",
  crmError: "--crm-error",
} as const;

/** Resolved CSS variable values — keep in sync with globals.css */
export const cssVarValues = {
  [cssVars.crmPrimary]: brand[600],
  [cssVars.crmSuccess]: semantic.success.DEFAULT,
  [cssVars.crmWarning]: semantic.warning.DEFAULT,
  [cssVars.crmError]: semantic.error.DEFAULT,
} as const;

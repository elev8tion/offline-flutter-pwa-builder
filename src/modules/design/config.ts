/**
 * Design Module Configuration
 *
 * Types and configuration for theme generation, animations, and design tokens
 */

import { z } from "zod";

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type AnimationType = "fade" | "slide" | "scale" | "rotation" | "custom";
export type CurveType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounceIn" | "bounceOut" | "elastic";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface TypographyConfig {
  fontFamily: string;
  headlineLarge: number;
  headlineMedium: number;
  headlineSmall: number;
  bodyLarge: number;
  bodyMedium: number;
  bodySmall: number;
  labelLarge: number;
}

export interface SpacingConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface BorderRadiusConfig {
  none: number;
  sm: number;
  md: number;
  lg: number;
  full: number;
}

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  curve: CurveType;
  repeat: boolean;
  reverseOnComplete: boolean;
}

export interface ThemeConfig {
  name: string;
  colors: ColorPalette;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  borderRadius: BorderRadiusConfig;
  useMaterial3: boolean;
  supportDarkMode: boolean;
}

export interface DesignModuleConfig {
  theme: ThemeConfig;
  animations: AnimationConfig[];
  generateDesignTokens: boolean;
  generateComponents: boolean;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ColorPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  error: z.string(),
  success: z.string(),
  warning: z.string(),
  info: z.string(),
});

export const TypographyConfigSchema = z.object({
  fontFamily: z.string(),
  headlineLarge: z.number(),
  headlineMedium: z.number(),
  headlineSmall: z.number(),
  bodyLarge: z.number(),
  bodyMedium: z.number(),
  bodySmall: z.number(),
  labelLarge: z.number(),
});

export const SpacingConfigSchema = z.object({
  xs: z.number(),
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  xl: z.number(),
  xxl: z.number(),
});

export const BorderRadiusConfigSchema = z.object({
  none: z.number(),
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  full: z.number(),
});

export const AnimationConfigSchema = z.object({
  type: z.enum(["fade", "slide", "scale", "rotation", "custom"]),
  duration: z.number(),
  curve: z.enum(["linear", "easeIn", "easeOut", "easeInOut", "bounceIn", "bounceOut", "elastic"]),
  repeat: z.boolean(),
  reverseOnComplete: z.boolean(),
});

export const ThemeConfigSchema = z.object({
  name: z.string(),
  colors: ColorPaletteSchema,
  typography: TypographyConfigSchema,
  spacing: SpacingConfigSchema,
  borderRadius: BorderRadiusConfigSchema,
  useMaterial3: z.boolean(),
  supportDarkMode: z.boolean(),
});

export const DesignModuleConfigSchema = z.object({
  theme: ThemeConfigSchema,
  animations: z.array(AnimationConfigSchema),
  generateDesignTokens: z.boolean(),
  generateComponents: z.boolean(),
});

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_DESIGN_CONFIG: DesignModuleConfig = {
  theme: {
    name: "AppTheme",
    colors: {
      primary: "#2196F3",
      secondary: "#03DAC6",
      accent: "#FF4081",
      background: "#FFFFFF",
      surface: "#FAFAFA",
      error: "#F44336",
      success: "#4CAF50",
      warning: "#FFC107",
      info: "#2196F3",
    },
    typography: {
      fontFamily: "Roboto",
      headlineLarge: 32,
      headlineMedium: 28,
      headlineSmall: 24,
      bodyLarge: 16,
      bodyMedium: 14,
      bodySmall: 12,
      labelLarge: 14,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    borderRadius: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 16,
      full: 9999,
    },
    useMaterial3: true,
    supportDarkMode: true,
  },
  animations: [],
  generateDesignTokens: true,
  generateComponents: true,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert hex color to Flutter Color
 */
export function hexToFlutterColor(hex: string): string {
  const color = hex.replace("#", "");
  return `Color(0xFF${color.toUpperCase()})`;
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Get contrasting color (black or white)
 */
export function getContrastColor(hex: string): string {
  return isLightColor(hex) ? "#000000" : "#FFFFFF";
}

/**
 * Convert animation curve to Flutter Curves constant
 */
export function curveToFlutter(curve: CurveType): string {
  const curveMap: Record<CurveType, string> = {
    linear: "Curves.linear",
    easeIn: "Curves.easeIn",
    easeOut: "Curves.easeOut",
    easeInOut: "Curves.easeInOut",
    bounceIn: "Curves.bounceIn",
    bounceOut: "Curves.bounceOut",
    elastic: "Curves.elasticOut",
  };
  return curveMap[curve];
}

/**
 * Validate hex color format
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ============================================================================
// EDC DESIGN SYSTEM INTERFACES
// ============================================================================

/**
 * Extended spacing config for EDC design tokens
 * Includes additional sizes: xxxl, huge
 */
export interface EdcSpacingConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
}

/**
 * Extended border radius config for EDC design tokens
 * Includes additional sizes: xl, xxl, pill
 */
export interface EdcBorderRadiusConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  pill: number;
}

/**
 * Animation timing config for EDC design tokens
 */
export interface EdcAnimationTimingConfig {
  instant: number;
  fast: number;
  normal: number;
  slow: number;
  verySlow: number;
  sequentialShort: number;
  sequentialMedium: number;
  sequentialLong: number;
  shimmer: number;
  sectionDelay: number;
  press: number;
}

/**
 * Component size config for EDC design tokens
 */
export interface EdcSizesConfig {
  iconXs: number;
  iconSm: number;
  iconMd: number;
  iconLg: number;
  iconXl: number;
  avatarSm: number;
  avatarMd: number;
  avatarLg: number;
  avatarXl: number;
  statCardWidth: number;
  statCardHeight: number;
  quickActionWidth: number;
  quickActionHeight: number;
  appBarHeight: number;
  buttonHeightSm: number;
  buttonHeightMd: number;
  buttonHeightLg: number;
}

/**
 * Blur strength config for glassmorphic effects
 */
export interface EdcBlurConfig {
  light: number;
  medium: number;
  strong: number;
  veryStrong: number;
}

/**
 * Extended color config for EDC design tokens
 */
export interface EdcColorConfig {
  primary: string;
  accent: string;
  secondary: string;
  gold?: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  textAlpha: {
    secondary: number;
    tertiary: number;
    disabled: number;
  };
  glassAlpha: {
    light: number;
    medium: number;
    subtle: number;
  };
  borderAlpha: {
    primary: number;
    accent: number;
    subtle: number;
  };
}

/**
 * Glass gradient level config
 */
export interface GlassGradientLevel {
  start: number;
  end: number;
}

/**
 * Glass gradients config for EDC design tokens
 */
export interface EdcGlassGradientsConfig {
  glass: {
    subtle: GlassGradientLevel;
    medium: GlassGradientLevel;
    strong: GlassGradientLevel;
    veryStrong: GlassGradientLevel;
  };
  colors: {
    primary: string;
    accent: string;
    gold?: string;
  };
  background: {
    dark: {
      start: string;
      middle: string;
      end: string;
    };
    light: {
      start: string;
      end: string;
    };
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

/**
 * WCAG verification pair config
 */
export interface WcagVerificationPair {
  name: string;
  foreground: string;
  background: string;
}

/**
 * WCAG contrast config for EDC design tokens
 */
export interface EdcWcagContrastConfig {
  includeVerification: boolean;
  verificationPairs?: WcagVerificationPair[];
}

/**
 * Complete EDC design tokens config
 */
export interface EdcDesignTokensConfig {
  spacing: EdcSpacingConfig;
  colors: EdcColorConfig;
  radius: EdcBorderRadiusConfig;
  animations: EdcAnimationTimingConfig;
  sizes: EdcSizesConfig;
  blur: EdcBlurConfig;
}

// ============================================================================
// EDC ZOD SCHEMAS
// ============================================================================

export const EdcSpacingConfigSchema = z.object({
  xs: z.number(),
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  xl: z.number(),
  xxl: z.number(),
  xxxl: z.number(),
  huge: z.number(),
});

export const EdcBorderRadiusConfigSchema = z.object({
  xs: z.number(),
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  xl: z.number(),
  xxl: z.number(),
  pill: z.number(),
});

export const EdcAnimationTimingConfigSchema = z.object({
  instant: z.number(),
  fast: z.number(),
  normal: z.number(),
  slow: z.number(),
  verySlow: z.number(),
  sequentialShort: z.number(),
  sequentialMedium: z.number(),
  sequentialLong: z.number(),
  shimmer: z.number(),
  sectionDelay: z.number(),
  press: z.number(),
});

export const EdcSizesConfigSchema = z.object({
  iconXs: z.number(),
  iconSm: z.number(),
  iconMd: z.number(),
  iconLg: z.number(),
  iconXl: z.number(),
  avatarSm: z.number(),
  avatarMd: z.number(),
  avatarLg: z.number(),
  avatarXl: z.number(),
  statCardWidth: z.number(),
  statCardHeight: z.number(),
  quickActionWidth: z.number(),
  quickActionHeight: z.number(),
  appBarHeight: z.number(),
  buttonHeightSm: z.number(),
  buttonHeightMd: z.number(),
  buttonHeightLg: z.number(),
});

export const EdcBlurConfigSchema = z.object({
  light: z.number(),
  medium: z.number(),
  strong: z.number(),
  veryStrong: z.number(),
});

export const EdcColorConfigSchema = z.object({
  primary: z.string(),
  accent: z.string(),
  secondary: z.string(),
  gold: z.string().optional(),
  success: z.string(),
  warning: z.string(),
  error: z.string(),
  info: z.string(),
  textAlpha: z.object({
    secondary: z.number(),
    tertiary: z.number(),
    disabled: z.number(),
  }),
  glassAlpha: z.object({
    light: z.number(),
    medium: z.number(),
    subtle: z.number(),
  }),
  borderAlpha: z.object({
    primary: z.number(),
    accent: z.number(),
    subtle: z.number(),
  }),
});

export const GlassGradientLevelSchema = z.object({
  start: z.number(),
  end: z.number(),
});

export const EdcGlassGradientsConfigSchema = z.object({
  glass: z.object({
    subtle: GlassGradientLevelSchema,
    medium: GlassGradientLevelSchema,
    strong: GlassGradientLevelSchema,
    veryStrong: GlassGradientLevelSchema,
  }),
  colors: z.object({
    primary: z.string(),
    accent: z.string(),
    gold: z.string().optional(),
  }),
  background: z.object({
    dark: z.object({
      start: z.string(),
      middle: z.string(),
      end: z.string(),
    }),
    light: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  status: z.object({
    success: z.string(),
    warning: z.string(),
    error: z.string(),
    info: z.string(),
  }),
});

export const WcagVerificationPairSchema = z.object({
  name: z.string(),
  foreground: z.string(),
  background: z.string(),
});

export const EdcWcagContrastConfigSchema = z.object({
  includeVerification: z.boolean(),
  verificationPairs: z.array(WcagVerificationPairSchema).optional(),
});

export const EdcDesignTokensConfigSchema = z.object({
  spacing: EdcSpacingConfigSchema,
  colors: EdcColorConfigSchema,
  radius: EdcBorderRadiusConfigSchema,
  animations: EdcAnimationTimingConfigSchema,
  sizes: EdcSizesConfigSchema,
  blur: EdcBlurConfigSchema,
});

// ============================================================================
// EDC DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_EDC_SPACING: EdcSpacingConfig = {
  xs: 4.0,
  sm: 8.0,
  md: 12.0,
  lg: 16.0,
  xl: 20.0,
  xxl: 24.0,
  xxxl: 32.0,
  huge: 40.0,
};

export const DEFAULT_EDC_BORDER_RADIUS: EdcBorderRadiusConfig = {
  xs: 8.0,
  sm: 12.0,
  md: 16.0,
  lg: 20.0,
  xl: 24.0,
  xxl: 28.0,
  pill: 100.0,
};

export const DEFAULT_EDC_ANIMATION_TIMING: EdcAnimationTimingConfig = {
  instant: 0,
  fast: 200,
  normal: 400,
  slow: 350,
  verySlow: 800,
  sequentialShort: 100,
  sequentialMedium: 150,
  sequentialLong: 200,
  shimmer: 1500,
  sectionDelay: 400,
  press: 80,
};

export const DEFAULT_EDC_SIZES: EdcSizesConfig = {
  iconXs: 16.0,
  iconSm: 20.0,
  iconMd: 24.0,
  iconLg: 32.0,
  iconXl: 40.0,
  avatarSm: 32.0,
  avatarMd: 40.0,
  avatarLg: 56.0,
  avatarXl: 80.0,
  statCardWidth: 140.0,
  statCardHeight: 120.0,
  quickActionWidth: 100.0,
  quickActionHeight: 120.0,
  appBarHeight: 56.0,
  buttonHeightSm: 40.0,
  buttonHeightMd: 48.0,
  buttonHeightLg: 56.0,
};

export const DEFAULT_EDC_BLUR: EdcBlurConfig = {
  light: 15.0,
  medium: 25.0,
  strong: 40.0,
  veryStrong: 60.0,
};

export const DEFAULT_EDC_COLORS: EdcColorConfig = {
  primary: "#6366F1",
  accent: "#D4AF37",
  secondary: "#64748B",
  gold: "#D4AF37",
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  info: "#2196F3",
  textAlpha: {
    secondary: 0.8,
    tertiary: 0.6,
    disabled: 0.4,
  },
  glassAlpha: {
    light: 0.15,
    medium: 0.1,
    subtle: 0.05,
  },
  borderAlpha: {
    primary: 0.2,
    accent: 0.6,
    subtle: 0.1,
  },
};

export const DEFAULT_EDC_GLASS_GRADIENTS: EdcGlassGradientsConfig = {
  glass: {
    subtle: { start: 0.10, end: 0.05 },
    medium: { start: 0.15, end: 0.08 },
    strong: { start: 0.20, end: 0.10 },
    veryStrong: { start: 0.25, end: 0.15 },
  },
  colors: {
    primary: "#6366F1",
    accent: "#8B5CF6",
    gold: "#D4AF37",
  },
  background: {
    dark: {
      start: "#1A1A2E",
      middle: "#16213E",
      end: "#0F3460",
    },
    light: {
      start: "#F8FAFF",
      end: "#E8F2FF",
    },
  },
  status: {
    success: "#4CAF50",
    warning: "#FFA726",
    error: "#F44336",
    info: "#2196F3",
  },
};

export const DEFAULT_EDC_WCAG_CONFIG: EdcWcagContrastConfig = {
  includeVerification: true,
  verificationPairs: [
    {
      name: "White on Primary",
      foreground: "Colors.white",
      background: "const Color(0xFF6366F1)",
    },
    {
      name: "White on Accent",
      foreground: "Colors.white",
      background: "const Color(0xFF8B5CF6)",
    },
    {
      name: "Dark on Light",
      foreground: "Colors.black87",
      background: "Colors.white",
    },
    {
      name: "Gold on Dark",
      foreground: "const Color(0xFFD4AF37)",
      background: "const Color(0xFF1E293B)",
    },
  ],
};

export const DEFAULT_EDC_DESIGN_TOKENS: EdcDesignTokensConfig = {
  spacing: DEFAULT_EDC_SPACING,
  colors: DEFAULT_EDC_COLORS,
  radius: DEFAULT_EDC_BORDER_RADIUS,
  animations: DEFAULT_EDC_ANIMATION_TIMING,
  sizes: DEFAULT_EDC_SIZES,
  blur: DEFAULT_EDC_BLUR,
};

// ============================================================================
// EDC HELPER FUNCTIONS
// ============================================================================

/**
 * Convert alpha value (0-1) to 2-digit hex string
 * Example: 0.15 -> "26" (26 in hex = 38 in decimal ~ 15% of 255)
 */
export function alphaToHex(alpha: number): string {
  const value = Math.round(alpha * 255);
  return value.toString(16).padStart(2, "0").toUpperCase();
}

/**
 * Extract hex color without # prefix
 * Example: "#D4AF37" -> "D4AF37"
 */
export function extractHexColor(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

/**
 * Calculate WCAG relative luminance for a hex color
 * Uses sRGB gamma correction formula
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG contrast ratio between two hex colors
 */
export function wcagContrastRatio(foreground: string, background: string): number {
  const lum1 = relativeLuminance(foreground) + 0.05;
  const lum2 = relativeLuminance(background) + 0.05;
  return lum1 > lum2 ? lum1 / lum2 : lum2 / lum1;
}

/**
 * Check if colors meet WCAG AA for normal text (4.5:1)
 */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return wcagContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if colors meet WCAG AA for large text (3:1)
 */
export function meetsWcagAALarge(foreground: string, background: string): boolean {
  return wcagContrastRatio(foreground, background) >= 3.0;
}

/**
 * Check if colors meet WCAG AAA for normal text (7:1)
 */
export function meetsWcagAAA(foreground: string, background: string): boolean {
  return wcagContrastRatio(foreground, background) >= 7.0;
}

/**
 * Get formatted WCAG contrast report
 */
export function getWcagContrastReport(foreground: string, background: string): string {
  const ratio = wcagContrastRatio(foreground, background);
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7.0;

  const aaStatus = passAA ? "[AA Pass]" : "[AA Fail]";
  const aaaStatus = passAAA ? "[AAA Pass]" : "[AAA Fail]";

  return `${ratio.toFixed(2)}:1 ${aaStatus} ${aaaStatus}`;
}

// ============================================================================
// GLASS COMPONENT INTERFACES
// ============================================================================

/**
 * Glass Card configuration
 */
export interface GlassCardConfig {
  defaultPadding: number;
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  darkModeAlpha: number;
  lightModeAlpha: number;
}

/**
 * Glass Container configuration
 */
export interface GlassContainerConfig {
  projectName?: string;
  includeNoiseOverlay: boolean;
  defaultPadding: number;
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  enableNoiseByDefault: boolean;
  enableLightSimulationByDefault: boolean;
  gradientStartAlpha: number;
  gradientEndAlpha: number;
  borderAlpha: number;
  ambientShadowAlpha: number;
  ambientShadowOffsetX: number;
  ambientShadowOffsetY: number;
  ambientShadowBlur: number;
  ambientShadowSpread: number;
  definitionShadowAlpha: number;
  definitionShadowOffsetX: number;
  definitionShadowOffsetY: number;
  definitionShadowBlur: number;
  definitionShadowSpread: number;
  lightSimulationAlpha: number;
  noiseOpacity: number;
  noiseDensity: number;
}

/**
 * Glass Button configuration
 */
export interface GlassButtonConfig {
  projectName?: string;
  includeAutoSize: boolean;
  includeNoiseOverlay: boolean;
  defaultHeight: number;
  enablePressAnimationByDefault: boolean;
  pressScale: number;
  enableHapticsByDefault: boolean;
  defaultHapticType: "light" | "medium" | "heavy";
  defaultBlurStrength: number;
  enableNoiseByDefault: boolean;
  enableLightSimulationByDefault: boolean;
  animationDuration: number;
  defaultBorderRadius: number;
  fontSize: number;
  backgroundAlpha: number;
  borderColor: string;
  borderWidth: number;
  noiseOpacity: number;
  noiseDensity: number;
  ambientShadowAlpha: number;
  ambientShadowOffsetX: number;
  ambientShadowOffsetY: number;
  ambientShadowBlur: number;
  ambientShadowSpread: number;
  definitionShadowAlpha: number;
  definitionShadowOffsetX: number;
  definitionShadowOffsetY: number;
  definitionShadowBlur: number;
  definitionShadowSpread: number;
  lightSimulationAlpha: number;
}

/**
 * Glass Bottom Sheet configuration
 */
export interface GlassBottomSheetConfig {
  defaultBorderRadius: number;
  defaultBlurStrength: number;
  defaultBorderWidth: number;
  darkModeAlpha: number;
  lightModeAlpha: number;
}

// ============================================================================
// GLASS COMPONENT ZOD SCHEMAS
// ============================================================================

export const GlassCardConfigSchema = z.object({
  defaultPadding: z.number(),
  defaultBorderRadius: z.number(),
  defaultBlurStrength: z.number(),
  defaultBorderWidth: z.number(),
  darkModeAlpha: z.number(),
  lightModeAlpha: z.number(),
});

export const GlassContainerConfigSchema = z.object({
  projectName: z.string().optional(),
  includeNoiseOverlay: z.boolean(),
  defaultPadding: z.number(),
  defaultBorderRadius: z.number(),
  defaultBlurStrength: z.number(),
  defaultBorderWidth: z.number(),
  enableNoiseByDefault: z.boolean(),
  enableLightSimulationByDefault: z.boolean(),
  gradientStartAlpha: z.number(),
  gradientEndAlpha: z.number(),
  borderAlpha: z.number(),
  ambientShadowAlpha: z.number(),
  ambientShadowOffsetX: z.number(),
  ambientShadowOffsetY: z.number(),
  ambientShadowBlur: z.number(),
  ambientShadowSpread: z.number(),
  definitionShadowAlpha: z.number(),
  definitionShadowOffsetX: z.number(),
  definitionShadowOffsetY: z.number(),
  definitionShadowBlur: z.number(),
  definitionShadowSpread: z.number(),
  lightSimulationAlpha: z.number(),
  noiseOpacity: z.number(),
  noiseDensity: z.number(),
});

export const GlassButtonConfigSchema = z.object({
  projectName: z.string().optional(),
  includeAutoSize: z.boolean(),
  includeNoiseOverlay: z.boolean(),
  defaultHeight: z.number(),
  enablePressAnimationByDefault: z.boolean(),
  pressScale: z.number(),
  enableHapticsByDefault: z.boolean(),
  defaultHapticType: z.enum(["light", "medium", "heavy"]),
  defaultBlurStrength: z.number(),
  enableNoiseByDefault: z.boolean(),
  enableLightSimulationByDefault: z.boolean(),
  animationDuration: z.number(),
  defaultBorderRadius: z.number(),
  fontSize: z.number(),
  backgroundAlpha: z.number(),
  borderColor: z.string(),
  borderWidth: z.number(),
  noiseOpacity: z.number(),
  noiseDensity: z.number(),
  ambientShadowAlpha: z.number(),
  ambientShadowOffsetX: z.number(),
  ambientShadowOffsetY: z.number(),
  ambientShadowBlur: z.number(),
  ambientShadowSpread: z.number(),
  definitionShadowAlpha: z.number(),
  definitionShadowOffsetX: z.number(),
  definitionShadowOffsetY: z.number(),
  definitionShadowBlur: z.number(),
  definitionShadowSpread: z.number(),
  lightSimulationAlpha: z.number(),
});

export const GlassBottomSheetConfigSchema = z.object({
  defaultBorderRadius: z.number(),
  defaultBlurStrength: z.number(),
  defaultBorderWidth: z.number(),
  darkModeAlpha: z.number(),
  lightModeAlpha: z.number(),
});

// ============================================================================
// GLASS COMPONENT DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_GLASS_CARD_CONFIG: GlassCardConfig = {
  defaultPadding: 16.0,
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  darkModeAlpha: 0.15,
  lightModeAlpha: 0.25,
};

export const DEFAULT_GLASS_CONTAINER_CONFIG: GlassContainerConfig = {
  projectName: "myapp",
  includeNoiseOverlay: false,
  defaultPadding: 16.0,
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  enableNoiseByDefault: false,
  enableLightSimulationByDefault: true,
  gradientStartAlpha: 0.15,
  gradientEndAlpha: 0.08,
  borderAlpha: 0.2,
  ambientShadowAlpha: 0.1,
  ambientShadowOffsetX: 0,
  ambientShadowOffsetY: 8,
  ambientShadowBlur: 24,
  ambientShadowSpread: 0,
  definitionShadowAlpha: 0.15,
  definitionShadowOffsetX: 0,
  definitionShadowOffsetY: 2,
  definitionShadowBlur: 4,
  definitionShadowSpread: 0,
  lightSimulationAlpha: 0.1,
  noiseOpacity: 0.15,
  noiseDensity: 0.5,
};

export const DEFAULT_GLASS_BUTTON_CONFIG: GlassButtonConfig = {
  projectName: "myapp",
  includeAutoSize: false,
  includeNoiseOverlay: false,
  defaultHeight: 56.0,
  enablePressAnimationByDefault: true,
  pressScale: 0.95,
  enableHapticsByDefault: true,
  defaultHapticType: "medium",
  defaultBlurStrength: 40.0,
  enableNoiseByDefault: false,
  enableLightSimulationByDefault: true,
  animationDuration: 80,
  defaultBorderRadius: 28,
  fontSize: 16.0,
  backgroundAlpha: 0.2,
  borderColor: "0xFFD4AF37",
  borderWidth: 1.5,
  noiseOpacity: 0.15,
  noiseDensity: 0.5,
  ambientShadowAlpha: 0.1,
  ambientShadowOffsetX: 0,
  ambientShadowOffsetY: 8,
  ambientShadowBlur: 24,
  ambientShadowSpread: 0,
  definitionShadowAlpha: 0.15,
  definitionShadowOffsetX: 0,
  definitionShadowOffsetY: 2,
  definitionShadowBlur: 4,
  definitionShadowSpread: 0,
  lightSimulationAlpha: 0.1,
};

export const DEFAULT_GLASS_BOTTOMSHEET_CONFIG: GlassBottomSheetConfig = {
  defaultBorderRadius: 24.0,
  defaultBlurStrength: 40.0,
  defaultBorderWidth: 1.5,
  darkModeAlpha: 0.85,
  lightModeAlpha: 0.95,
};

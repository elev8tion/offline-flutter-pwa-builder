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

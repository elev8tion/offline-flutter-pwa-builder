/**
 * Design Module
 *
 * Theme generation, animations, and design token management
 * for Flutter projects.
 */

import type { Module } from "../../core/types.js";
import {
  DesignModuleConfig,
  DEFAULT_DESIGN_CONFIG,
  DesignModuleConfigSchema,
  AnimationType,
  CurveType,
  ColorPalette,
  TypographyConfig,
  SpacingConfig,
  BorderRadiusConfig,
  AnimationConfig,
  ThemeConfig,
  hexToFlutterColor,
  hexToRgb,
  isLightColor,
  getContrastColor,
  curveToFlutter,
  isValidHexColor,
} from "./config.js";
import {
  DESIGN_TOOLS,
  DesignToolContext,
  handleDesignTool,
  GenerateThemeInputSchema,
  CreateAnimationInputSchema,
  GenerateDesignTokensInputSchema,
} from "./tools.js";
import { designHooks, registerDesignHelpers } from "./hooks.js";
import { DESIGN_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const DesignModule: Module = {
  id: "design",
  name: "Design Module",
  version: "1.0.0",
  description: "Theme generation, animations, and design token management for Flutter",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: DesignModuleConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_DESIGN_CONFIG as unknown as Record<string, unknown>,
  hooks: designHooks,
  templates: DESIGN_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  DesignModuleConfig,
  AnimationType,
  CurveType,
  ColorPalette,
  TypographyConfig,
  SpacingConfig,
  BorderRadiusConfig,
  AnimationConfig,
  ThemeConfig,
};

export {
  DEFAULT_DESIGN_CONFIG,
  DesignModuleConfigSchema,
  hexToFlutterColor,
  hexToRgb,
  isLightColor,
  getContrastColor,
  curveToFlutter,
  isValidHexColor,
};

// Tools exports
export type { DesignToolContext };

export {
  DESIGN_TOOLS,
  handleDesignTool,
  GenerateThemeInputSchema,
  CreateAnimationInputSchema,
  GenerateDesignTokensInputSchema,
};

// Hooks exports
export { designHooks, registerDesignHelpers };

// Templates exports
export { DESIGN_TEMPLATES };

// Module export
export default DesignModule;

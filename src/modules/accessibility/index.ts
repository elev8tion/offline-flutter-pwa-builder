/**
 * Accessibility Module
 *
 * WCAG compliance auditing, accessibility fixes, and internationalization (i18n)
 * for Flutter projects.
 */

import type { Module } from "../../core/types.js";
import {
  AccessibilityModuleConfig,
  DEFAULT_ACCESSIBILITY_CONFIG,
  AccessibilityConfigSchema,
  WCAGLevel,
  IssueSeverity,
  FixType,
  AccessibilityIssue,
  AuditResult,
  TranslationKey,
  I18nConfig,
  ContrastConfig,
  TouchTargetConfig,
  SemanticConfig,
  getSeverityWeight,
  sortBySeverity,
  calculateScore,
  getLanguageName,
  toCamelCase,
  toSnakeCase,
} from "./config.js";
import {
  ACCESSIBILITY_TOOLS,
  AccessibilityToolContext,
  handleAccessibilityTool,
  AuditWCAGInputSchema,
  GenerateFixesInputSchema,
  SetupI18nInputSchema,
  GenerateTranslationsInputSchema,
} from "./tools.js";
import { accessibilityHooks, registerAccessibilityHelpers } from "./hooks.js";
import { ACCESSIBILITY_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const AccessibilityModule: Module = {
  id: "accessibility",
  name: "Accessibility Module",
  version: "1.0.0",
  description: "WCAG compliance auditing, accessibility fixes, and internationalization (i18n) support",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: AccessibilityConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_ACCESSIBILITY_CONFIG as unknown as Record<string, unknown>,
  hooks: accessibilityHooks,
  templates: ACCESSIBILITY_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  AccessibilityModuleConfig,
  WCAGLevel,
  IssueSeverity,
  FixType,
  AccessibilityIssue,
  AuditResult,
  TranslationKey,
  I18nConfig,
  ContrastConfig,
  TouchTargetConfig,
  SemanticConfig,
};

export {
  DEFAULT_ACCESSIBILITY_CONFIG,
  AccessibilityConfigSchema,
  getSeverityWeight,
  sortBySeverity,
  calculateScore,
  getLanguageName,
  toCamelCase,
  toSnakeCase,
};

// Tools exports
export type { AccessibilityToolContext };

export {
  ACCESSIBILITY_TOOLS,
  handleAccessibilityTool,
  AuditWCAGInputSchema,
  GenerateFixesInputSchema,
  SetupI18nInputSchema,
  GenerateTranslationsInputSchema,
};

// Hooks exports
export { accessibilityHooks, registerAccessibilityHelpers };

// Templates exports
export { ACCESSIBILITY_TEMPLATES };

// Module export
export default AccessibilityModule;

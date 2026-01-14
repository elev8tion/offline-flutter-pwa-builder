/**
 * Accessibility Module Configuration
 *
 * Types and configuration for WCAG compliance, i18n, and accessibility audits
 */

import { z } from "zod";

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type WCAGLevel = "A" | "AA" | "AAA";
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type FixType = "semantic" | "contrast" | "touch-target" | "label" | "focus";

// ============================================================================
// INTERFACES
// ============================================================================

export interface AccessibilityIssue {
  file: string;
  line?: number;
  issue: string;
  wcagCriteria: string;
  severity: IssueSeverity;
  fix: string;
  fixType: FixType;
}

export interface AuditResult {
  projectPath: string;
  wcagLevel: WCAGLevel;
  timestamp: string;
  issues: AccessibilityIssue[];
  warnings: AccessibilityIssue[];
  passed: string[];
  score: number;
}

export interface TranslationKey {
  key: string;
  defaultValue: string;
  description?: string;
}

export interface I18nConfig {
  languages: string[];
  defaultLanguage: string;
  translationKeys: TranslationKey[];
  useFlutterGen: boolean;
  generatePlaceholders: boolean;
}

export interface ContrastConfig {
  minRatioNormalText: number;
  minRatioLargeText: number;
  checkDarkMode: boolean;
}

export interface TouchTargetConfig {
  minWidth: number;
  minHeight: number;
  checkPadding: boolean;
}

export interface SemanticConfig {
  requireImageLabels: boolean;
  requireIconLabels: boolean;
  requireFormLabels: boolean;
  checkCustomPaint: boolean;
}

export interface AccessibilityModuleConfig {
  wcagLevel: WCAGLevel;
  autoFix: boolean;
  contrast: ContrastConfig;
  touchTargets: TouchTargetConfig;
  semantics: SemanticConfig;
  i18n: I18nConfig;
  excludePatterns: string[];
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const TranslationKeySchema = z.object({
  key: z.string(),
  defaultValue: z.string(),
  description: z.string().optional(),
});

export const I18nConfigSchema = z.object({
  languages: z.array(z.string()),
  defaultLanguage: z.string(),
  translationKeys: z.array(TranslationKeySchema),
  useFlutterGen: z.boolean(),
  generatePlaceholders: z.boolean(),
});

export const ContrastConfigSchema = z.object({
  minRatioNormalText: z.number(),
  minRatioLargeText: z.number(),
  checkDarkMode: z.boolean(),
});

export const TouchTargetConfigSchema = z.object({
  minWidth: z.number(),
  minHeight: z.number(),
  checkPadding: z.boolean(),
});

export const SemanticConfigSchema = z.object({
  requireImageLabels: z.boolean(),
  requireIconLabels: z.boolean(),
  requireFormLabels: z.boolean(),
  checkCustomPaint: z.boolean(),
});

export const AccessibilityConfigSchema = z.object({
  wcagLevel: z.enum(["A", "AA", "AAA"]),
  autoFix: z.boolean(),
  contrast: ContrastConfigSchema,
  touchTargets: TouchTargetConfigSchema,
  semantics: SemanticConfigSchema,
  i18n: I18nConfigSchema,
  excludePatterns: z.array(z.string()),
});

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityModuleConfig = {
  wcagLevel: "AA",
  autoFix: false,
  contrast: {
    minRatioNormalText: 4.5,
    minRatioLargeText: 3.0,
    checkDarkMode: true,
  },
  touchTargets: {
    minWidth: 44,
    minHeight: 44,
    checkPadding: true,
  },
  semantics: {
    requireImageLabels: true,
    requireIconLabels: true,
    requireFormLabels: true,
    checkCustomPaint: true,
  },
  i18n: {
    languages: ["en"],
    defaultLanguage: "en",
    translationKeys: [],
    useFlutterGen: true,
    generatePlaceholders: true,
  },
  excludePatterns: ["**/*.g.dart", "**/generated/**"],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get severity weight for sorting
 */
export function getSeverityWeight(severity: IssueSeverity): number {
  const weights: Record<IssueSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return weights[severity];
}

/**
 * Sort issues by severity (highest first)
 */
export function sortBySeverity(issues: AccessibilityIssue[]): AccessibilityIssue[] {
  return [...issues].sort(
    (a, b) => getSeverityWeight(b.severity) - getSeverityWeight(a.severity)
  );
}

/**
 * Calculate accessibility score (0-100)
 */
export function calculateScore(
  totalChecks: number,
  issues: AccessibilityIssue[],
  warnings: AccessibilityIssue[]
): number {
  if (totalChecks === 0) return 100;

  const issueWeight = issues.reduce(
    (sum, issue) => sum + getSeverityWeight(issue.severity) * 2,
    0
  );
  const warningWeight = warnings.reduce(
    (sum, warning) => sum + getSeverityWeight(warning.severity),
    0
  );

  const penalty = ((issueWeight + warningWeight) / (totalChecks * 4)) * 100;
  return Math.max(0, Math.round(100 - penalty));
}

/**
 * Get WCAG criteria description
 */
export function getWCAGDescription(criteria: string): string {
  const descriptions: Record<string, string> = {
    "1.1.1": "Non-text Content - Provide text alternatives for non-text content",
    "1.4.3": "Contrast (Minimum) - Text has minimum 4.5:1 contrast ratio",
    "1.4.6": "Contrast (Enhanced) - Text has minimum 7:1 contrast ratio",
    "2.4.7": "Focus Visible - Keyboard focus indicator is visible",
    "2.5.5": "Target Size - Touch targets are at least 44x44 CSS pixels",
    "3.3.2": "Labels or Instructions - Form fields have associated labels",
    "4.1.2": "Name, Role, Value - All UI components have accessible names",
  };
  return descriptions[criteria] || criteria;
}

/**
 * Language code to language name
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    ru: "Russian",
  };
  return names[code] || code.toUpperCase();
}

/**
 * Convert string to camelCase (for translation keys)
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toLowerCase());
}

/**
 * Convert string to snake_case (for ARB keys)
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

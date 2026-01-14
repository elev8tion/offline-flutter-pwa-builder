/**
 * Analysis Module Configuration
 *
 * Types and configuration for project analysis, dependency auditing,
 * code quality checks, and architecture pattern detection
 */

import { z } from "zod";

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type AnalysisLevel = "basic" | "standard" | "comprehensive";
export type ArchitecturePattern = "clean" | "mvvm" | "mvc" | "feature-first" | "layer-first" | "unknown";
export type DependencyCategory = "stateManagement" | "networking" | "database" | "ui" | "testing" | "utilities";
export type CodeQualityMetric = "complexity" | "coupling" | "cohesion" | "coverage" | "duplication";
export type IssueSeverity = "info" | "warning" | "error" | "critical";

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProjectStructure {
  hasModels: boolean;
  hasViews: boolean;
  hasControllers: boolean;
  hasServices: boolean;
  hasUtils: boolean;
  hasWidgets: boolean;
  hasConfig: boolean;
  hasTests: boolean;
}

export interface DependencyInfo {
  name: string;
  version: string;
  category: DependencyCategory;
  isDevDependency: boolean;
  outdated?: boolean;
  latestVersion?: string;
}

export interface PatternDetection {
  type: string;
  file: string;
  line?: number;
  confidence: number;
}

export interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  avgFileSize: number;
  complexity: number;
  duplicateBlocks: number;
  testCoverage?: number;
}

export interface AnalysisIssue {
  severity: IssueSeverity;
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface BestPracticeCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: IssueSeverity;
}

export interface AnalysisConfig {
  level: AnalysisLevel;
  extractPatterns: boolean;
  analyzeDependencies: boolean;
  checkBestPractices: boolean;
  calculateMetrics: boolean;
  detectArchitecture: boolean;
  maxFilesToAnalyze: number;
}

export interface AnalysisResult {
  projectPath: string;
  timestamp: string;
  structure: ProjectStructure;
  architecture: ArchitecturePattern;
  dependencies: DependencyInfo[];
  patterns: PatternDetection[];
  metrics: CodeMetrics;
  issues: AnalysisIssue[];
  bestPractices: BestPracticeCheck[];
  recommendations: string[];
}

export interface AnalysisModuleConfig {
  defaultLevel: AnalysisLevel;
  enableAutoFix: boolean;
  ignoredPatterns: string[];
  ignoredFiles: string[];
  customRules: AnalysisRule[];
}

export interface AnalysisRule {
  id: string;
  name: string;
  description: string;
  severity: IssueSeverity;
  pattern: string;
  suggestion: string;
  enabled: boolean;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const ProjectStructureSchema = z.object({
  hasModels: z.boolean(),
  hasViews: z.boolean(),
  hasControllers: z.boolean(),
  hasServices: z.boolean(),
  hasUtils: z.boolean(),
  hasWidgets: z.boolean(),
  hasConfig: z.boolean(),
  hasTests: z.boolean(),
});

export const DependencyInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  category: z.enum(["stateManagement", "networking", "database", "ui", "testing", "utilities"]),
  isDevDependency: z.boolean(),
  outdated: z.boolean().optional(),
  latestVersion: z.string().optional(),
});

export const PatternDetectionSchema = z.object({
  type: z.string(),
  file: z.string(),
  line: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

export const CodeMetricsSchema = z.object({
  totalFiles: z.number(),
  totalLines: z.number(),
  avgFileSize: z.number(),
  complexity: z.number(),
  duplicateBlocks: z.number(),
  testCoverage: z.number().optional(),
});

export const AnalysisIssueSchema = z.object({
  severity: z.enum(["info", "warning", "error", "critical"]),
  category: z.string(),
  message: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  suggestion: z.string().optional(),
});

export const AnalysisRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.enum(["info", "warning", "error", "critical"]),
  pattern: z.string(),
  suggestion: z.string(),
  enabled: z.boolean(),
});

export const AnalysisModuleConfigSchema = z.object({
  defaultLevel: z.enum(["basic", "standard", "comprehensive"]),
  enableAutoFix: z.boolean(),
  ignoredPatterns: z.array(z.string()),
  ignoredFiles: z.array(z.string()),
  customRules: z.array(AnalysisRuleSchema),
});

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_ANALYSIS_CONFIG: AnalysisModuleConfig = {
  defaultLevel: "standard",
  enableAutoFix: false,
  ignoredPatterns: [
    "*.g.dart",
    "*.freezed.dart",
    "*.gen.dart",
  ],
  ignoredFiles: [
    ".dart_tool/**",
    "build/**",
    ".flutter-plugins*",
  ],
  customRules: [],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get severity weight for sorting
 */
export function getSeverityWeight(severity: IssueSeverity): number {
  const weights: Record<IssueSeverity, number> = {
    info: 1,
    warning: 2,
    error: 3,
    critical: 4,
  };
  return weights[severity];
}

/**
 * Categorize a dependency by name
 */
export function categorizeDependency(name: string): DependencyCategory {
  const categories: Record<string, DependencyCategory> = {
    // State management
    provider: "stateManagement",
    riverpod: "stateManagement",
    flutter_riverpod: "stateManagement",
    hooks_riverpod: "stateManagement",
    get: "stateManagement",
    getx: "stateManagement",
    bloc: "stateManagement",
    flutter_bloc: "stateManagement",
    mobx: "stateManagement",
    redux: "stateManagement",
    // Networking
    dio: "networking",
    http: "networking",
    retrofit: "networking",
    chopper: "networking",
    graphql_flutter: "networking",
    graphql: "networking",
    // Database
    sqflite: "database",
    hive: "database",
    shared_preferences: "database",
    drift: "database",
    floor: "database",
    isar: "database",
    realm: "database",
    // UI
    flutter_animate: "ui",
    animations: "ui",
    lottie: "ui",
    flutter_svg: "ui",
    cached_network_image: "ui",
    shimmer: "ui",
    // Testing
    flutter_test: "testing",
    mockito: "testing",
    mocktail: "testing",
    bloc_test: "testing",
    golden_toolkit: "testing",
  };
  return categories[name] || "utilities";
}

/**
 * Detect architecture pattern from structure
 */
export function detectArchitecture(structure: ProjectStructure): ArchitecturePattern {
  if (structure.hasModels && structure.hasViews && structure.hasControllers && structure.hasServices) {
    return "clean";
  }
  if (structure.hasModels && structure.hasViews && structure.hasControllers) {
    return "mvvm";
  }
  if (structure.hasModels && structure.hasViews && structure.hasServices) {
    return "mvc";
  }
  if (structure.hasWidgets && structure.hasServices) {
    return "feature-first";
  }
  return "unknown";
}

/**
 * Calculate complexity score (simplified)
 */
export function calculateComplexity(lines: number, files: number): number {
  if (files === 0) return 0;
  const avgLines = lines / files;
  // Simple complexity heuristic
  if (avgLines < 100) return 1;
  if (avgLines < 200) return 2;
  if (avgLines < 400) return 3;
  if (avgLines < 600) return 4;
  return 5;
}

/**
 * Format analysis issue for display
 */
export function formatIssue(issue: AnalysisIssue): string {
  let prefix = "";
  switch (issue.severity) {
    case "critical":
      prefix = "[CRITICAL]";
      break;
    case "error":
      prefix = "[ERROR]";
      break;
    case "warning":
      prefix = "[WARNING]";
      break;
    case "info":
      prefix = "[INFO]";
      break;
  }

  let location = "";
  if (issue.file) {
    location = ` at ${issue.file}`;
    if (issue.line) {
      location += `:${issue.line}`;
    }
  }

  return `${prefix} ${issue.category}: ${issue.message}${location}`;
}

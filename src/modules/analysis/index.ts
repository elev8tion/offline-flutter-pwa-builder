/**
 * Analysis Module
 *
 * Project analysis, dependency auditing, architecture detection,
 * and code quality reporting for Flutter projects.
 */

import type { Module } from "../../core/types.js";
import {
  AnalysisModuleConfig,
  DEFAULT_ANALYSIS_CONFIG,
  AnalysisModuleConfigSchema,
  AnalysisLevel,
  ArchitecturePattern,
  DependencyCategory,
  CodeQualityMetric,
  IssueSeverity,
  ProjectStructure,
  DependencyInfo,
  PatternDetection,
  CodeMetrics,
  AnalysisIssue,
  BestPracticeCheck,
  AnalysisConfig,
  AnalysisResult,
  AnalysisRule,
  getSeverityWeight,
  categorizeDependency,
  detectArchitecture,
  calculateComplexity,
  formatIssue,
} from "./config.js";
import {
  ANALYSIS_TOOLS,
  AnalysisToolContext,
  handleAnalysisTool,
  AnalyzeProjectInputSchema,
  AuditDependenciesInputSchema,
  DetectArchitectureInputSchema,
  GenerateReportInputSchema,
} from "./tools.js";
import { analysisHooks, registerAnalysisHelpers } from "./hooks.js";
import { ANALYSIS_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const AnalysisModule: Module = {
  id: "analysis",
  name: "Analysis Module",
  version: "1.0.0",
  description: "Project analysis, dependency auditing, architecture detection, and code quality reporting",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: AnalysisModuleConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_ANALYSIS_CONFIG as unknown as Record<string, unknown>,
  hooks: analysisHooks,
  templates: ANALYSIS_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  AnalysisModuleConfig,
  AnalysisLevel,
  ArchitecturePattern,
  DependencyCategory,
  CodeQualityMetric,
  IssueSeverity,
  ProjectStructure,
  DependencyInfo,
  PatternDetection,
  CodeMetrics,
  AnalysisIssue,
  BestPracticeCheck,
  AnalysisConfig,
  AnalysisResult,
  AnalysisRule,
};

export {
  DEFAULT_ANALYSIS_CONFIG,
  AnalysisModuleConfigSchema,
  getSeverityWeight,
  categorizeDependency,
  detectArchitecture,
  calculateComplexity,
  formatIssue,
};

// Tools exports
export type { AnalysisToolContext };

export {
  ANALYSIS_TOOLS,
  handleAnalysisTool,
  AnalyzeProjectInputSchema,
  AuditDependenciesInputSchema,
  DetectArchitectureInputSchema,
  GenerateReportInputSchema,
};

// Hooks exports
export { analysisHooks, registerAnalysisHelpers };

// Templates exports
export { ANALYSIS_TEMPLATES };

// Module export
export default AnalysisModule;

/**
 * Performance Module
 *
 * Memory leak detection, build size analysis, render performance optimization,
 * and asset optimization for Flutter projects.
 */

import type { Module } from "../../core/types.js";
import {
  PerformanceModuleConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceConfigSchema,
  MemoryIssue,
  RenderPerformanceIssue,
  BuildSizeMetrics,
  IssueSeverity,
  MemoryLeakDetectionConfig,
  BuildSizeConfig,
  RenderPerformanceConfig,
  AssetOptimizationConfig,
  formatBytes,
  bytesToMB,
  getSeverityWeight,
  sortBySeverity,
} from "./config.js";
import {
  PERFORMANCE_TOOLS,
  PerformanceToolContext,
  handlePerformanceTool,
  AnalyzePerformanceInputSchema,
  OptimizeAssetsInputSchema,
  CheckMemoryLeaksInputSchema,
  AnalyzeBuildSizeInputSchema,
  GeneratePerformanceReportInputSchema,
  ConfigureThresholdsInputSchema,
} from "./tools.js";
import { performanceHooks, registerPerformanceHelpers } from "./hooks.js";
import { PERFORMANCE_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const PerformanceModule: Module = {
  id: "performance",
  name: "Performance Module",
  version: "1.0.0",
  description: "Memory leak detection, build size analysis, render performance optimization, and asset optimization",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: PerformanceConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_PERFORMANCE_CONFIG as unknown as Record<string, unknown>,
  hooks: performanceHooks,
  templates: PERFORMANCE_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  PerformanceModuleConfig,
  MemoryIssue,
  RenderPerformanceIssue,
  BuildSizeMetrics,
  IssueSeverity,
  MemoryLeakDetectionConfig,
  BuildSizeConfig,
  RenderPerformanceConfig,
  AssetOptimizationConfig,
};

export {
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceConfigSchema,
  formatBytes,
  bytesToMB,
  getSeverityWeight,
  sortBySeverity,
};

// Tools exports
export type { PerformanceToolContext };

export {
  PERFORMANCE_TOOLS,
  handlePerformanceTool,
  AnalyzePerformanceInputSchema,
  OptimizeAssetsInputSchema,
  CheckMemoryLeaksInputSchema,
  AnalyzeBuildSizeInputSchema,
  GeneratePerformanceReportInputSchema,
  ConfigureThresholdsInputSchema,
};

// Hooks exports
export { performanceHooks, registerPerformanceHelpers };

// Templates exports
export { PERFORMANCE_TEMPLATES };

// Module export
export default PerformanceModule;

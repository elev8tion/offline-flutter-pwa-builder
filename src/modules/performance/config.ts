/**
 * Performance Module Configuration
 *
 * Types and defaults for performance analysis (memory leaks, build size, render performance)
 */

import { z } from "zod";

// ============================================================================
// SEVERITY TYPES
// ============================================================================

export type IssueSeverity = "critical" | "high" | "medium" | "low";

// ============================================================================
// MEMORY LEAK DETECTION
// ============================================================================

export interface MemoryIssue {
  file: string;
  line?: number;
  issue: string;
  severity: IssueSeverity;
  suggestion: string;
  pattern: string;
}

export interface MemoryLeakDetectionConfig {
  enabled: boolean;
  checkStreamControllers: boolean;
  checkAnimationControllers: boolean;
  checkTextEditingControllers: boolean;
  checkFocusNodes: boolean;
  checkScrollControllers: boolean;
  checkMountedState: boolean;
  customPatterns: Array<{
    pattern: string;
    issue: string;
    suggestion: string;
    severity: IssueSeverity;
  }>;
}

// ============================================================================
// BUILD SIZE ANALYSIS
// ============================================================================

export interface BuildSizeMetrics {
  platform: "android" | "ios" | "web";
  sizeBytes: number;
  sizeMB: string;
  breakdown?: {
    assets: number;
    code: number;
    nativeLibs: number;
    resources: number;
  };
}

export interface BuildSizeConfig {
  enabled: boolean;
  maxApkSizeMB: number;
  maxIpaSizeMB: number;
  maxWebBundleSizeMB: number;
  warnOnLargeAssets: boolean;
  largeAssetThresholdKB: number;
}

// ============================================================================
// RENDER PERFORMANCE
// ============================================================================

export interface RenderPerformanceIssue {
  file: string;
  line?: number;
  issue: string;
  severity: IssueSeverity;
  suggestion: string;
}

export interface RenderPerformanceConfig {
  enabled: boolean;
  checkAsyncInBuild: boolean;
  checkExcessiveSetState: boolean;
  maxSetStatePerFile: number;
  checkDeepNesting: boolean;
  maxNestingLevel: number;
  checkExpensiveOperations: boolean;
  checkConstConstructors: boolean;
}

// ============================================================================
// ASSET OPTIMIZATION
// ============================================================================

export interface AssetOptimizationConfig {
  enabled: boolean;
  compressImages: boolean;
  generateWebP: boolean;
  removeUnused: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  jpegQuality: number;
  pngCompressionLevel: number;
}

// ============================================================================
// MODULE CONFIG
// ============================================================================

export interface PerformanceModuleConfig {
  memoryLeakDetection: MemoryLeakDetectionConfig;
  buildSize: BuildSizeConfig;
  renderPerformance: RenderPerformanceConfig;
  assetOptimization: AssetOptimizationConfig;
  excludePatterns: string[];
  analysisHistory: Array<{
    timestamp: string;
    issues: number;
    buildSizeMB?: number;
  }>;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceModuleConfig = {
  memoryLeakDetection: {
    enabled: true,
    checkStreamControllers: true,
    checkAnimationControllers: true,
    checkTextEditingControllers: true,
    checkFocusNodes: true,
    checkScrollControllers: true,
    checkMountedState: true,
    customPatterns: [],
  },
  buildSize: {
    enabled: true,
    maxApkSizeMB: 50,
    maxIpaSizeMB: 100,
    maxWebBundleSizeMB: 5,
    warnOnLargeAssets: true,
    largeAssetThresholdKB: 500,
  },
  renderPerformance: {
    enabled: true,
    checkAsyncInBuild: true,
    checkExcessiveSetState: true,
    maxSetStatePerFile: 5,
    checkDeepNesting: true,
    maxNestingLevel: 15,
    checkExpensiveOperations: true,
    checkConstConstructors: true,
  },
  assetOptimization: {
    enabled: true,
    compressImages: true,
    generateWebP: true,
    removeUnused: false,
    maxImageWidth: 2048,
    maxImageHeight: 2048,
    jpegQuality: 85,
    pngCompressionLevel: 6,
  },
  excludePatterns: ["**/*.g.dart", "**/*.freezed.dart"],
  analysisHistory: [],
};

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const MemoryLeakDetectionSchema = z.object({
  enabled: z.boolean(),
  checkStreamControllers: z.boolean(),
  checkAnimationControllers: z.boolean(),
  checkTextEditingControllers: z.boolean(),
  checkFocusNodes: z.boolean(),
  checkScrollControllers: z.boolean(),
  checkMountedState: z.boolean(),
  customPatterns: z.array(z.object({
    pattern: z.string(),
    issue: z.string(),
    suggestion: z.string(),
    severity: z.enum(["critical", "high", "medium", "low"]),
  })),
});

export const BuildSizeSchema = z.object({
  enabled: z.boolean(),
  maxApkSizeMB: z.number().min(1).max(500),
  maxIpaSizeMB: z.number().min(1).max(1000),
  maxWebBundleSizeMB: z.number().min(0.5).max(50),
  warnOnLargeAssets: z.boolean(),
  largeAssetThresholdKB: z.number().min(10).max(10000),
});

export const RenderPerformanceSchema = z.object({
  enabled: z.boolean(),
  checkAsyncInBuild: z.boolean(),
  checkExcessiveSetState: z.boolean(),
  maxSetStatePerFile: z.number().min(1).max(50),
  checkDeepNesting: z.boolean(),
  maxNestingLevel: z.number().min(5).max(50),
  checkExpensiveOperations: z.boolean(),
  checkConstConstructors: z.boolean(),
});

export const AssetOptimizationSchema = z.object({
  enabled: z.boolean(),
  compressImages: z.boolean(),
  generateWebP: z.boolean(),
  removeUnused: z.boolean(),
  maxImageWidth: z.number().min(100).max(8192),
  maxImageHeight: z.number().min(100).max(8192),
  jpegQuality: z.number().min(1).max(100),
  pngCompressionLevel: z.number().min(0).max(9),
});

export const PerformanceConfigSchema = z.object({
  memoryLeakDetection: MemoryLeakDetectionSchema,
  buildSize: BuildSizeSchema,
  renderPerformance: RenderPerformanceSchema,
  assetOptimization: AssetOptimizationSchema,
  excludePatterns: z.array(z.string()),
  analysisHistory: z.array(z.object({
    timestamp: z.string(),
    issues: z.number(),
    buildSizeMB: z.number().optional(),
  })),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export function getSeverityWeight(severity: IssueSeverity): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export function sortBySeverity<T extends { severity: IssueSeverity }>(issues: T[]): T[] {
  return [...issues].sort(
    (a, b) => getSeverityWeight(b.severity) - getSeverityWeight(a.severity)
  );
}

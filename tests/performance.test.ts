/**
 * Performance Module Tests
 */

import {
  PerformanceModuleConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceConfigSchema,
  MemoryIssue,
  RenderPerformanceIssue,
  formatBytes,
  bytesToMB,
  getSeverityWeight,
  sortBySeverity,
} from "../src/modules/performance/config.js";
import {
  PerformanceModule,
  PERFORMANCE_TOOLS,
  handlePerformanceTool,
} from "../src/modules/performance/index.js";
import { performanceHooks } from "../src/modules/performance/hooks.js";
import { PERFORMANCE_TEMPLATES } from "../src/modules/performance/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

describe("Performance Config", () => {
  describe("Helper Functions", () => {
    test("formatBytes should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(500)).toBe("500 Bytes");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });

    test("bytesToMB should convert bytes to MB string", () => {
      expect(bytesToMB(0)).toBe("0.00");
      expect(bytesToMB(1048576)).toBe("1.00");
      expect(bytesToMB(52428800)).toBe("50.00");
      expect(bytesToMB(104857600)).toBe("100.00");
    });

    test("getSeverityWeight should return correct weights", () => {
      expect(getSeverityWeight("critical")).toBe(4);
      expect(getSeverityWeight("high")).toBe(3);
      expect(getSeverityWeight("medium")).toBe(2);
      expect(getSeverityWeight("low")).toBe(1);
    });

    test("sortBySeverity should sort issues by severity (highest first)", () => {
      const issues: MemoryIssue[] = [
        { file: "a.dart", issue: "low issue", severity: "low", suggestion: "", pattern: "" },
        { file: "b.dart", issue: "critical issue", severity: "critical", suggestion: "", pattern: "" },
        { file: "c.dart", issue: "medium issue", severity: "medium", suggestion: "", pattern: "" },
        { file: "d.dart", issue: "high issue", severity: "high", suggestion: "", pattern: "" },
      ];

      const sorted = sortBySeverity(issues);
      expect(sorted[0].severity).toBe("critical");
      expect(sorted[1].severity).toBe("high");
      expect(sorted[2].severity).toBe("medium");
      expect(sorted[3].severity).toBe("low");
    });

    test("sortBySeverity should not mutate original array", () => {
      const issues: RenderPerformanceIssue[] = [
        { file: "a.dart", issue: "low", severity: "low", suggestion: "" },
        { file: "b.dart", issue: "high", severity: "high", suggestion: "" },
      ];

      const sorted = sortBySeverity(issues);
      expect(issues[0].severity).toBe("low"); // Original unchanged
      expect(sorted[0].severity).toBe("high"); // Sorted differently
    });
  });

  describe("Default Config", () => {
    test("should have valid memory leak detection config", () => {
      const { memoryLeakDetection } = DEFAULT_PERFORMANCE_CONFIG;
      expect(memoryLeakDetection.enabled).toBe(true);
      expect(memoryLeakDetection.checkStreamControllers).toBe(true);
      expect(memoryLeakDetection.checkAnimationControllers).toBe(true);
      expect(memoryLeakDetection.checkTextEditingControllers).toBe(true);
      expect(memoryLeakDetection.checkFocusNodes).toBe(true);
      expect(memoryLeakDetection.checkScrollControllers).toBe(true);
      expect(memoryLeakDetection.checkMountedState).toBe(true);
      expect(memoryLeakDetection.customPatterns).toEqual([]);
    });

    test("should have valid build size config", () => {
      const { buildSize } = DEFAULT_PERFORMANCE_CONFIG;
      expect(buildSize.enabled).toBe(true);
      expect(buildSize.maxApkSizeMB).toBe(50);
      expect(buildSize.maxIpaSizeMB).toBe(100);
      expect(buildSize.maxWebBundleSizeMB).toBe(5);
      expect(buildSize.warnOnLargeAssets).toBe(true);
      expect(buildSize.largeAssetThresholdKB).toBe(500);
    });

    test("should have valid render performance config", () => {
      const { renderPerformance } = DEFAULT_PERFORMANCE_CONFIG;
      expect(renderPerformance.enabled).toBe(true);
      expect(renderPerformance.checkAsyncInBuild).toBe(true);
      expect(renderPerformance.checkExcessiveSetState).toBe(true);
      expect(renderPerformance.maxSetStatePerFile).toBe(5);
      expect(renderPerformance.checkDeepNesting).toBe(true);
      expect(renderPerformance.maxNestingLevel).toBe(15);
      expect(renderPerformance.checkExpensiveOperations).toBe(true);
      expect(renderPerformance.checkConstConstructors).toBe(true);
    });

    test("should have valid asset optimization config", () => {
      const { assetOptimization } = DEFAULT_PERFORMANCE_CONFIG;
      expect(assetOptimization.enabled).toBe(true);
      expect(assetOptimization.compressImages).toBe(true);
      expect(assetOptimization.generateWebP).toBe(true);
      expect(assetOptimization.removeUnused).toBe(false);
      expect(assetOptimization.maxImageWidth).toBe(2048);
      expect(assetOptimization.maxImageHeight).toBe(2048);
      expect(assetOptimization.jpegQuality).toBe(85);
      expect(assetOptimization.pngCompressionLevel).toBe(6);
    });

    test("should have exclude patterns", () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.excludePatterns).toContain("**/*.g.dart");
      expect(DEFAULT_PERFORMANCE_CONFIG.excludePatterns).toContain("**/*.freezed.dart");
    });

    test("should have empty analysis history", () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.analysisHistory).toEqual([]);
    });
  });

  describe("Schema Validation", () => {
    test("should validate valid config", () => {
      const result = PerformanceConfigSchema.safeParse(DEFAULT_PERFORMANCE_CONFIG);
      expect(result.success).toBe(true);
    });

    test("should validate config with custom patterns", () => {
      const config: PerformanceModuleConfig = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        memoryLeakDetection: {
          ...DEFAULT_PERFORMANCE_CONFIG.memoryLeakDetection,
          customPatterns: [
            {
              pattern: "CustomController",
              issue: "CustomController not disposed",
              suggestion: "Call dispose() in dispose method",
              severity: "high",
            },
          ],
        },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test("should validate config with analysis history", () => {
      const config: PerformanceModuleConfig = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        analysisHistory: [
          { timestamp: "2024-01-01T00:00:00Z", issues: 5 },
          { timestamp: "2024-01-02T00:00:00Z", issues: 3, buildSizeMB: 45.2 },
        ],
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test("should reject invalid APK size", () => {
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        buildSize: { ...DEFAULT_PERFORMANCE_CONFIG.buildSize, maxApkSizeMB: 0 },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should reject invalid web bundle size", () => {
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        buildSize: { ...DEFAULT_PERFORMANCE_CONFIG.buildSize, maxWebBundleSizeMB: 0.1 },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should reject invalid setState per file limit", () => {
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        renderPerformance: { ...DEFAULT_PERFORMANCE_CONFIG.renderPerformance, maxSetStatePerFile: 0 },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should reject invalid nesting level", () => {
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        renderPerformance: { ...DEFAULT_PERFORMANCE_CONFIG.renderPerformance, maxNestingLevel: 3 },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should reject invalid JPEG quality", () => {
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        assetOptimization: { ...DEFAULT_PERFORMANCE_CONFIG.assetOptimization, jpegQuality: 150 },
      };
      const result = PerformanceConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("Performance Module", () => {
  test("should have correct module metadata", () => {
    expect(PerformanceModule.id).toBe("performance");
    expect(PerformanceModule.name).toBe("Performance Module");
    expect(PerformanceModule.version).toBe("1.0.0");
    expect(PerformanceModule.description.toLowerCase()).toContain("memory");
    expect(PerformanceModule.description.toLowerCase()).toContain("build size");
    expect(PerformanceModule.description.toLowerCase()).toContain("render");
  });

  test("should support all platforms", () => {
    expect(PerformanceModule.compatibleTargets).toContain("web");
    expect(PerformanceModule.compatibleTargets).toContain("android");
    expect(PerformanceModule.compatibleTargets).toContain("ios");
    expect(PerformanceModule.compatibleTargets).toContain("windows");
    expect(PerformanceModule.compatibleTargets).toContain("macos");
    expect(PerformanceModule.compatibleTargets).toContain("linux");
  });

  test("should have no dependencies or conflicts", () => {
    expect(PerformanceModule.dependencies).toEqual([]);
    expect(PerformanceModule.conflicts).toEqual([]);
  });

  test("should have templates", () => {
    expect(PerformanceModule.templates).toBeDefined();
    expect(PerformanceModule.templates.length).toBeGreaterThan(0);
  });

  test("should have hooks", () => {
    expect(PerformanceModule.hooks).toBeDefined();
    expect(PerformanceModule.hooks.onInstall).toBeDefined();
    expect(PerformanceModule.hooks.beforeGenerate).toBeDefined();
    expect(PerformanceModule.hooks.onGenerate).toBeDefined();
    expect(PerformanceModule.hooks.afterGenerate).toBeDefined();
    expect(PerformanceModule.hooks.beforeBuild).toBeDefined();
    expect(PerformanceModule.hooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("Performance Tools", () => {
  test("should define all tools", () => {
    expect(PERFORMANCE_TOOLS.length).toBe(6);

    const toolNames = PERFORMANCE_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("performance_analyze");
    expect(toolNames).toContain("performance_check_memory_leaks");
    expect(toolNames).toContain("performance_analyze_build_size");
    expect(toolNames).toContain("performance_optimize_assets");
    expect(toolNames).toContain("performance_generate_report");
    expect(toolNames).toContain("performance_configure_thresholds");
  });

  test("performance_analyze should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_analyze");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("checkMemoryLeaks");
    expect(tool?.inputSchema.properties).toHaveProperty("analyzeBuildSize");
    expect(tool?.inputSchema.properties).toHaveProperty("checkRenderPerformance");
    expect(tool?.inputSchema.required).toContain("projectId");
  });

  test("performance_check_memory_leaks should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_check_memory_leaks");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("targetPath");
    expect(tool?.inputSchema.properties).toHaveProperty("includeCustomPatterns");
    expect(tool?.inputSchema.required).toContain("projectId");
  });

  test("performance_analyze_build_size should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_analyze_build_size");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("platform");
    expect(tool?.inputSchema.properties).toHaveProperty("buildPath");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("platform");
  });

  test("performance_optimize_assets should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_optimize_assets");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("assetsPath");
    expect(tool?.inputSchema.properties).toHaveProperty("compressImages");
    expect(tool?.inputSchema.properties).toHaveProperty("generateWebP");
    expect(tool?.inputSchema.properties).toHaveProperty("removeUnused");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("assetsPath");
  });

  test("performance_generate_report should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_generate_report");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("format");
    expect(tool?.inputSchema.properties).toHaveProperty("includeHistory");
    expect(tool?.inputSchema.required).toContain("projectId");
  });

  test("performance_configure_thresholds should have correct schema", () => {
    const tool = PERFORMANCE_TOOLS.find((t) => t.name === "performance_configure_thresholds");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("maxApkSizeMB");
    expect(tool?.inputSchema.properties).toHaveProperty("maxIpaSizeMB");
    expect(tool?.inputSchema.properties).toHaveProperty("maxWebBundleSizeMB");
    expect(tool?.inputSchema.properties).toHaveProperty("maxSetStatePerFile");
    expect(tool?.inputSchema.properties).toHaveProperty("maxNestingLevel");
    expect(tool?.inputSchema.required).toContain("projectId");
  });
});

describe("Performance Tool Handlers", () => {
  let mockProject: ProjectDefinition;

  const getMockContext = () => ({
    getProject: (id: string) => (id === TEST_PROJECT_UUID ? mockProject : undefined),
    updateProject: async (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
      return mockProject;
    },
    getPerformanceConfig: (projectId: string) => {
      if (projectId !== TEST_PROJECT_UUID) return undefined;
      const moduleConfig = mockProject.modules.find((m) => m.id === "performance");
      return moduleConfig?.config as PerformanceModuleConfig | undefined;
    },
    updatePerformanceConfig: (_projectId: string, config: Partial<PerformanceModuleConfig>) => {
      const moduleIndex = mockProject.modules.findIndex((m) => m.id === "performance");
      if (moduleIndex >= 0) {
        mockProject.modules[moduleIndex].config = {
          ...mockProject.modules[moduleIndex].config,
          ...config,
        };
      } else {
        mockProject.modules.push({
          id: "performance",
          enabled: true,
          config: config,
        });
      }
    },
  });

  beforeEach(() => {
    const freshPerformanceConfig: PerformanceModuleConfig = {
      ...DEFAULT_PERFORMANCE_CONFIG,
      memoryLeakDetection: { ...DEFAULT_PERFORMANCE_CONFIG.memoryLeakDetection, customPatterns: [] },
      buildSize: { ...DEFAULT_PERFORMANCE_CONFIG.buildSize },
      renderPerformance: { ...DEFAULT_PERFORMANCE_CONFIG.renderPerformance },
      assetOptimization: { ...DEFAULT_PERFORMANCE_CONFIG.assetOptimization },
      excludePatterns: [...DEFAULT_PERFORMANCE_CONFIG.excludePatterns],
      analysisHistory: [],
    };

    mockProject = {
      id: TEST_PROJECT_UUID,
      name: "test_app",
      displayName: "Test App",
      version: "1.0.0",
      pwa: {
        name: "Test App",
        shortName: "Test",
        description: "A test app",
        themeColor: "#2196F3",
        backgroundColor: "#FFFFFF",
        display: "standalone",
        orientation: "any",
        icons: [],
        startUrl: "/",
        scope: "/",
      },
      offline: {
        strategy: "offline-first",
        storage: { type: "drift", encryption: false },
        caching: { assets: true, api: true, ttl: 3600 },
      },
      architecture: "feature-first",
      stateManagement: "riverpod",
      modules: [
        {
          id: "performance",
          enabled: true,
          config: freshPerformanceConfig as unknown as Record<string, unknown>,
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  test("performance_analyze should generate comprehensive analysis", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_analyze",
      {
        projectId: TEST_PROJECT_UUID,
        checkMemoryLeaks: true,
        analyzeBuildSize: true,
        checkRenderPerformance: true,
      },
      mockContext
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Performance Analysis");
    expect(result.content[0].text).toContain("test_app");
    expect(result.content[0].text).toContain("Memory Leak Analysis");
    expect(result.content[0].text).toContain("Render Performance Analysis");
    expect(result.content[0].text).toContain("General Recommendations");
  });

  test("performance_check_memory_leaks should generate detection patterns", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_check_memory_leaks",
      {
        projectId: TEST_PROJECT_UUID,
        targetPath: "lib/",
        includeCustomPatterns: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Memory Leak Detection");
    expect(result.content[0].text).toContain("StreamController");
    expect(result.content[0].text).toContain("AnimationController");
    expect(result.content[0].text).toContain("setState");
    expect(result.content[0].text).toContain("mounted");
    expect(result.content[0].text).toContain("dispose()");
    expect(result.content[0].text).toContain("MemoryLeakDetection");
    expect(result.content[0].text).toContain("DevTools");
  });

  test("performance_analyze_build_size for Android should generate APK analysis", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_analyze_build_size",
      {
        projectId: TEST_PROJECT_UUID,
        platform: "android",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Build Size Analysis");
    expect(result.content[0].text).toContain("ANDROID");
    expect(result.content[0].text).toContain("50 MB");
    expect(result.content[0].text).toContain("flutter build apk");
    expect(result.content[0].text).toContain("--analyze-size");
    expect(result.content[0].text).toContain("split-per-abi");
    expect(result.content[0].text).toContain("App Bundles");
  });

  test("performance_analyze_build_size for iOS should generate IPA analysis", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_analyze_build_size",
      {
        projectId: TEST_PROJECT_UUID,
        platform: "ios",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("IOS");
    expect(result.content[0].text).toContain("100 MB");
    expect(result.content[0].text).toContain("flutter build ipa");
    expect(result.content[0].text).toContain("Bitcode");
  });

  test("performance_analyze_build_size for Web should generate bundle analysis", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_analyze_build_size",
      {
        projectId: TEST_PROJECT_UUID,
        platform: "web",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("WEB");
    expect(result.content[0].text).toContain("5 MB");
    expect(result.content[0].text).toContain("flutter build web");
    expect(result.content[0].text).toContain("canvaskit");
    expect(result.content[0].text).toContain("deferred loading");
  });

  test("performance_optimize_assets should generate optimization script", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_optimize_assets",
      {
        projectId: TEST_PROJECT_UUID,
        assetsPath: "assets/images",
        compressImages: true,
        generateWebP: true,
        removeUnused: false,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Asset Optimization");
    expect(result.content[0].text).toContain("assets/images");
    expect(result.content[0].text).toContain("Compress Images: Yes");
    expect(result.content[0].text).toContain("Generate WebP: Yes");
    expect(result.content[0].text).toContain("Remove Unused: No");
    expect(result.content[0].text).toContain("optimize_assets.sh");
    expect(result.content[0].text).toContain("convert");
    expect(result.content[0].text).toContain("cwebp");
    expect(result.content[0].text).toContain("CachedNetworkImage");
  });

  test("performance_optimize_assets with removeUnused should include unused detection", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_optimize_assets",
      {
        projectId: TEST_PROJECT_UUID,
        assetsPath: "assets",
        removeUnused: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Remove Unused: Yes");
    expect(result.content[0].text).toContain("Potentially unused");
  });

  test("performance_generate_report should generate markdown report", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_generate_report",
      {
        projectId: TEST_PROJECT_UUID,
        format: "markdown",
        includeHistory: false,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("# Performance Report");
    expect(result.content[0].text).toContain("test_app");
    expect(result.content[0].text).toContain("Memory Leak Detection");
    expect(result.content[0].text).toContain("Build Size Limits");
    expect(result.content[0].text).toContain("Render Performance");
    expect(result.content[0].text).toContain("Recommendations");
  });

  test("performance_generate_report should generate JSON report", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_generate_report",
      {
        projectId: TEST_PROJECT_UUID,
        format: "json",
      },
      mockContext
    );

    const jsonContent = JSON.parse(result.content[0].text);
    expect(jsonContent).toHaveProperty("project", "test_app");
    expect(jsonContent).toHaveProperty("timestamp");
    expect(jsonContent).toHaveProperty("recommendations");
    expect(jsonContent.recommendations.length).toBeGreaterThan(0);
  });

  test("performance_configure_thresholds should update config", async () => {
    const mockContext = getMockContext();
    const result = await handlePerformanceTool(
      "performance_configure_thresholds",
      {
        projectId: TEST_PROJECT_UUID,
        maxApkSizeMB: 40,
        maxIpaSizeMB: 80,
        maxWebBundleSizeMB: 3,
        maxSetStatePerFile: 3,
        maxNestingLevel: 10,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Performance Thresholds Updated");
    expect(result.content[0].text).toContain("40 MB");
    expect(result.content[0].text).toContain("80 MB");
    expect(result.content[0].text).toContain("3 MB");
    expect(result.content[0].text).toContain("setState per file: 3");
    expect(result.content[0].text).toContain("nesting level: 10");

    const config = mockContext.getPerformanceConfig(TEST_PROJECT_UUID);
    expect(config?.buildSize?.maxApkSizeMB).toBe(40);
    expect(config?.buildSize?.maxIpaSizeMB).toBe(80);
    expect(config?.buildSize?.maxWebBundleSizeMB).toBe(3);
    expect(config?.renderPerformance?.maxSetStatePerFile).toBe(3);
    expect(config?.renderPerformance?.maxNestingLevel).toBe(10);
  });

  test("should throw error for non-existent project", async () => {
    const mockContext = getMockContext();
    await expect(
      handlePerformanceTool(
        "performance_analyze",
        { projectId: NON_EXISTENT_UUID },
        mockContext
      )
    ).rejects.toThrow(/not found/);
  });

  test("should handle unknown performance tool", async () => {
    const mockContext = getMockContext();
    await expect(
      handlePerformanceTool(
        "performance_unknown_tool",
        { projectId: TEST_PROJECT_UUID },
        mockContext
      )
    ).rejects.toThrow(/Unknown performance tool/);
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Performance Hooks", () => {
  test("should have all required hooks", () => {
    expect(performanceHooks.onInstall).toBeDefined();
    expect(performanceHooks.beforeGenerate).toBeDefined();
    expect(performanceHooks.onGenerate).toBeDefined();
    expect(performanceHooks.afterGenerate).toBeDefined();
    expect(performanceHooks.beforeBuild).toBeDefined();
    expect(performanceHooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// TEMPLATES TESTS
// ============================================================================

describe("Performance Templates", () => {
  test("should have required templates", () => {
    expect(PERFORMANCE_TEMPLATES.length).toBeGreaterThan(0);

    const templateIds = PERFORMANCE_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain("performance-monitoring-mixin");
    expect(templateIds).toContain("performance-memory-tracker");
    expect(templateIds).toContain("performance-asset-optimizer");
    expect(templateIds).toContain("performance-ci-workflow");
    expect(templateIds).toContain("performance-report-template");
  });

  test("templates should have correct structure", () => {
    for (const template of PERFORMANCE_TEMPLATES) {
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("description");
      expect(template).toHaveProperty("type");
      expect(template).toHaveProperty("output");
      expect(template).toHaveProperty("source");
      // Verify output structure
      expect(template.output).toHaveProperty("path");
      expect(template.output).toHaveProperty("filename");
      expect(template.output).toHaveProperty("extension");
    }
  });

  test("monitoring mixin template should have valid content", () => {
    const template = PERFORMANCE_TEMPLATES.find((t) => t.id === "performance-monitoring-mixin");
    expect(template).toBeDefined();
    expect(template?.source).toContain("PerformanceMonitoring");
    expect(template?.source).toContain("Stopwatch");
    expect(template?.source).toContain("dispose");
  });

  test("memory tracker template should have valid content", () => {
    const template = PERFORMANCE_TEMPLATES.find((t) => t.id === "performance-memory-tracker");
    expect(template).toBeDefined();
    expect(template?.source).toContain("MemoryTracker");
    expect(template?.source).toContain("StreamSubscription");
    expect(template?.source).toContain("dispose");
    expect(template?.source).toContain("safeSetState");
  });

  test("asset optimizer template should have valid content", () => {
    const template = PERFORMANCE_TEMPLATES.find((t) => t.id === "performance-asset-optimizer");
    expect(template).toBeDefined();
    expect(template?.source).toContain("#!/bin/bash");
    expect(template?.source).toContain("convert");
    expect(template?.source).toContain("cwebp");
  });

  test("CI workflow template should have valid content", () => {
    const template = PERFORMANCE_TEMPLATES.find((t) => t.id === "performance-ci-workflow");
    expect(template).toBeDefined();
    expect(template?.source).toContain("flutter");
    expect(template?.source).toContain("build");
  });
});

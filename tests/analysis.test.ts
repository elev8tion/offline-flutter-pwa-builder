/**
 * Analysis Module Tests
 */

import {
  AnalysisModule,
  DEFAULT_ANALYSIS_CONFIG,
  AnalysisModuleConfigSchema,
  ANALYSIS_TOOLS,
  ANALYSIS_TEMPLATES,
  getSeverityWeight,
  categorizeDependency,
  detectArchitecture,
  calculateComplexity,
  formatIssue,
} from "../src/modules/analysis/index.js";

describe("Analysis Module", () => {
  describe("Module Definition", () => {
    it("should have correct module metadata", () => {
      expect(AnalysisModule.id).toBe("analysis");
      expect(AnalysisModule.name).toBe("Analysis Module");
      expect(AnalysisModule.version).toBe("1.0.0");
      expect(AnalysisModule.description.toLowerCase()).toContain("analysis");
    });

    it("should be compatible with all platforms", () => {
      expect(AnalysisModule.compatibleTargets).toContain("web");
      expect(AnalysisModule.compatibleTargets).toContain("android");
      expect(AnalysisModule.compatibleTargets).toContain("ios");
    });

    it("should have hooks defined", () => {
      expect(AnalysisModule.hooks).toBeDefined();
      expect(AnalysisModule.hooks.onInstall).toBeDefined();
      expect(AnalysisModule.hooks.onGenerate).toBeDefined();
    });

    it("should have templates", () => {
      expect(AnalysisModule.templates.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should have valid default config", () => {
      expect(DEFAULT_ANALYSIS_CONFIG).toBeDefined();
      expect(DEFAULT_ANALYSIS_CONFIG.defaultLevel).toBe("standard");
    });

    it("should have enableAutoFix set to false by default", () => {
      expect(DEFAULT_ANALYSIS_CONFIG.enableAutoFix).toBe(false);
    });

    it("should have ignored patterns", () => {
      expect(DEFAULT_ANALYSIS_CONFIG.ignoredPatterns).toContain("*.g.dart");
      expect(DEFAULT_ANALYSIS_CONFIG.ignoredPatterns).toContain("*.freezed.dart");
    });

    it("should have ignored files", () => {
      expect(DEFAULT_ANALYSIS_CONFIG.ignoredFiles).toBeDefined();
      expect(Array.isArray(DEFAULT_ANALYSIS_CONFIG.ignoredFiles)).toBe(true);
    });

    it("should have empty custom rules by default", () => {
      expect(DEFAULT_ANALYSIS_CONFIG.customRules).toEqual([]);
    });
  });

  describe("Schema Validation", () => {
    it("should validate correct config", () => {
      const result = AnalysisModuleConfigSchema.safeParse(DEFAULT_ANALYSIS_CONFIG);
      expect(result.success).toBe(true);
    });

    it("should accept custom analysis level", () => {
      const levels = ["basic", "standard", "comprehensive"] as const;
      levels.forEach((level) => {
        const config = {
          ...DEFAULT_ANALYSIS_CONFIG,
          defaultLevel: level,
        };
        const result = AnalysisModuleConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    it("should accept custom ignored patterns", () => {
      const config = {
        ...DEFAULT_ANALYSIS_CONFIG,
        ignoredPatterns: ["*.custom.dart", "*.generated.dart"],
      };
      const result = AnalysisModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Tools", () => {
    it("should export analysis tools", () => {
      expect(ANALYSIS_TOOLS).toBeDefined();
      expect(Array.isArray(ANALYSIS_TOOLS)).toBe(true);
      expect(ANALYSIS_TOOLS.length).toBe(4);
    });

    it("should have analysis_analyze_project tool", () => {
      const tool = ANALYSIS_TOOLS.find((t) => t.name === "analysis_analyze_project");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("analysis");
    });

    it("should have analysis_audit_dependencies tool", () => {
      const tool = ANALYSIS_TOOLS.find((t) => t.name === "analysis_audit_dependencies");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("dependencies");
    });

    it("should have analysis_detect_architecture tool", () => {
      const tool = ANALYSIS_TOOLS.find((t) => t.name === "analysis_detect_architecture");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("architecture");
    });

    it("should have analysis_generate_report tool", () => {
      const tool = ANALYSIS_TOOLS.find((t) => t.name === "analysis_generate_report");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("report");
    });

    it("should have valid input schemas for all tools", () => {
      ANALYSIS_TOOLS.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe("Templates", () => {
    it("should export templates", () => {
      expect(ANALYSIS_TEMPLATES).toBeDefined();
      expect(Array.isArray(ANALYSIS_TEMPLATES)).toBe(true);
      expect(ANALYSIS_TEMPLATES.length).toBeGreaterThan(0);
    });

    it("should have analysis-report template", () => {
      const template = ANALYSIS_TEMPLATES.find((t) => t.id === "analysis-report");
      expect(template).toBeDefined();
      expect(template?.type).toBe("file");
    });

    it("should have analysis-dependency-report template", () => {
      const template = ANALYSIS_TEMPLATES.find((t) => t.id === "analysis-dependency-report");
      expect(template).toBeDefined();
    });

    it("should have analysis-metrics-dashboard template", () => {
      const template = ANALYSIS_TEMPLATES.find((t) => t.id === "analysis-metrics-dashboard");
      expect(template).toBeDefined();
    });

    it("should have analysis-health-indicator template", () => {
      const template = ANALYSIS_TEMPLATES.find((t) => t.id === "analysis-health-indicator");
      expect(template).toBeDefined();
    });

    it("should have valid output paths", () => {
      ANALYSIS_TEMPLATES.forEach((template) => {
        expect(template.output).toBeDefined();
        expect(template.output.path).toBeDefined();
        expect(template.output.filename).toBeDefined();
        expect(template.output.extension).toBeDefined();
      });
    });
  });

  describe("Helper Functions", () => {
    describe("getSeverityWeight", () => {
      it("should return correct weights for severities", () => {
        expect(getSeverityWeight("info")).toBe(1);
        expect(getSeverityWeight("warning")).toBe(2);
        expect(getSeverityWeight("error")).toBe(3);
        expect(getSeverityWeight("critical")).toBe(4);
      });
    });

    describe("categorizeDependency", () => {
      it("should categorize state management dependencies", () => {
        expect(categorizeDependency("riverpod")).toBe("stateManagement");
        expect(categorizeDependency("flutter_bloc")).toBe("stateManagement");
        expect(categorizeDependency("provider")).toBe("stateManagement");
        expect(categorizeDependency("mobx")).toBe("stateManagement");
      });

      it("should categorize networking dependencies", () => {
        expect(categorizeDependency("dio")).toBe("networking");
        expect(categorizeDependency("http")).toBe("networking");
        expect(categorizeDependency("retrofit")).toBe("networking");
      });

      it("should categorize database dependencies", () => {
        expect(categorizeDependency("drift")).toBe("database");
        expect(categorizeDependency("sqflite")).toBe("database");
        expect(categorizeDependency("hive")).toBe("database");
      });

      it("should categorize UI dependencies", () => {
        expect(categorizeDependency("flutter_animate")).toBe("ui");
        expect(categorizeDependency("lottie")).toBe("ui");
        expect(categorizeDependency("flutter_svg")).toBe("ui");
      });

      it("should categorize testing dependencies", () => {
        expect(categorizeDependency("mockito")).toBe("testing");
        expect(categorizeDependency("bloc_test")).toBe("testing");
      });

      it("should return utilities for unknown dependencies", () => {
        expect(categorizeDependency("unknown_package")).toBe("utilities");
      });
    });

    describe("detectArchitecture", () => {
      it("should detect clean architecture", () => {
        const structure = {
          hasModels: true,
          hasViews: true,
          hasControllers: true,
          hasServices: true,
          hasUtils: true,
          hasWidgets: true,
          hasConfig: true,
          hasTests: true,
        };
        expect(detectArchitecture(structure)).toBe("clean");
      });

      it("should detect MVVM architecture", () => {
        const structure = {
          hasModels: true,
          hasViews: true,
          hasControllers: true,
          hasServices: false,
          hasUtils: false,
          hasWidgets: false,
          hasConfig: false,
          hasTests: false,
        };
        expect(detectArchitecture(structure)).toBe("mvvm");
      });

      it("should detect MVC architecture", () => {
        const structure = {
          hasModels: true,
          hasViews: true,
          hasControllers: false,
          hasServices: true,
          hasUtils: false,
          hasWidgets: false,
          hasConfig: false,
          hasTests: false,
        };
        expect(detectArchitecture(structure)).toBe("mvc");
      });

      it("should return unknown for unclear patterns", () => {
        const structure = {
          hasModels: false,
          hasViews: false,
          hasControllers: false,
          hasServices: false,
          hasUtils: false,
          hasWidgets: false,
          hasConfig: false,
          hasTests: false,
        };
        expect(detectArchitecture(structure)).toBe("unknown");
      });
    });

    describe("calculateComplexity", () => {
      it("should return low complexity for small files", () => {
        expect(calculateComplexity(500, 10)).toBe(1); // 50 lines avg
      });

      it("should return higher complexity for larger files", () => {
        expect(calculateComplexity(6500, 10)).toBe(5); // 650 lines avg (>= 600 returns 5)
      });

      it("should return medium complexity for medium files", () => {
        expect(calculateComplexity(5000, 10)).toBe(4); // 500 lines avg (< 600 returns 4)
      });

      it("should handle zero files", () => {
        expect(calculateComplexity(0, 0)).toBe(0);
      });
    });

    describe("formatIssue", () => {
      it("should format info issue correctly", () => {
        const issue = {
          severity: "info" as const,
          category: "Style",
          message: "Consider using const",
        };
        const formatted = formatIssue(issue);
        expect(formatted).toContain("[INFO]");
        expect(formatted).toContain("Style");
        expect(formatted).toContain("Consider using const");
      });

      it("should format error issue with file location", () => {
        const issue = {
          severity: "error" as const,
          category: "Syntax",
          message: "Missing semicolon",
          file: "main.dart",
          line: 42,
        };
        const formatted = formatIssue(issue);
        expect(formatted).toContain("[ERROR]");
        expect(formatted).toContain("main.dart");
        expect(formatted).toContain("42");
      });

      it("should format critical issue", () => {
        const issue = {
          severity: "critical" as const,
          category: "Security",
          message: "Hardcoded credentials detected",
        };
        const formatted = formatIssue(issue);
        expect(formatted).toContain("[CRITICAL]");
        expect(formatted).toContain("Security");
      });
    });
  });
});

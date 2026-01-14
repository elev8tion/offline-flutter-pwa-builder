/**
 * Accessibility Module Tests
 */

import {
  AccessibilityModuleConfig,
  DEFAULT_ACCESSIBILITY_CONFIG,
  AccessibilityConfigSchema,
  getSeverityWeight,
  sortBySeverity,
  calculateScore,
  getLanguageName,
  toCamelCase,
  toSnakeCase,
} from "../src/modules/accessibility/config.js";
import {
  AccessibilityModule,
  ACCESSIBILITY_TOOLS,
  handleAccessibilityTool,
} from "../src/modules/accessibility/index.js";
import { accessibilityHooks } from "../src/modules/accessibility/hooks.js";
import { ACCESSIBILITY_TEMPLATES } from "../src/modules/accessibility/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

describe("Accessibility Config", () => {
  describe("Helper Functions", () => {
    test("getSeverityWeight should return correct weights", () => {
      expect(getSeverityWeight("critical")).toBe(4);
      expect(getSeverityWeight("high")).toBe(3);
      expect(getSeverityWeight("medium")).toBe(2);
      expect(getSeverityWeight("low")).toBe(1);
    });

    test("sortBySeverity should sort issues by severity (highest first)", () => {
      const issues = [
        { severity: "low" as const, file: "a.dart", issue: "Issue A", wcagCriteria: "1.1.1", fix: "Fix A", fixType: "semantic" as const },
        { severity: "critical" as const, file: "b.dart", issue: "Issue B", wcagCriteria: "1.1.1", fix: "Fix B", fixType: "semantic" as const },
        { severity: "medium" as const, file: "c.dart", issue: "Issue C", wcagCriteria: "1.1.1", fix: "Fix C", fixType: "semantic" as const },
        { severity: "high" as const, file: "d.dart", issue: "Issue D", wcagCriteria: "1.1.1", fix: "Fix D", fixType: "semantic" as const },
      ];

      const sorted = sortBySeverity(issues);

      expect(sorted[0].severity).toBe("critical");
      expect(sorted[1].severity).toBe("high");
      expect(sorted[2].severity).toBe("medium");
      expect(sorted[3].severity).toBe("low");
    });

    test("calculateScore should calculate accessibility score", () => {
      // No issues = perfect score
      expect(calculateScore(10, [], [])).toBe(100);

      // Some issues
      const issues = [
        { severity: "high" as const, file: "a.dart", issue: "Issue", wcagCriteria: "1.1.1", fix: "Fix", fixType: "semantic" as const },
      ];
      const score = calculateScore(10, issues, []);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    test("calculateScore should return 100 for zero total checks", () => {
      expect(calculateScore(0, [], [])).toBe(100);
    });

    test("getLanguageName should return language name from code", () => {
      expect(getLanguageName("en")).toBe("English");
      expect(getLanguageName("es")).toBe("Spanish");
      expect(getLanguageName("fr")).toBe("French");
      expect(getLanguageName("de")).toBe("German");
      expect(getLanguageName("zh")).toBe("Chinese");
      expect(getLanguageName("ja")).toBe("Japanese");
      // Unknown codes return uppercase
      expect(getLanguageName("xx")).toBe("XX");
    });

    test("toCamelCase should convert strings correctly", () => {
      expect(toCamelCase("hello_world")).toBe("helloWorld");
      expect(toCamelCase("hello-world")).toBe("helloWorld");
      expect(toCamelCase("hello world")).toBe("helloWorld");
      expect(toCamelCase("HelloWorld")).toBe("helloWorld");
    });

    test("toSnakeCase should convert strings correctly", () => {
      expect(toSnakeCase("helloWorld")).toBe("hello_world");
      expect(toSnakeCase("HelloWorld")).toBe("hello_world");
      expect(toSnakeCase("hello-world")).toBe("hello_world");
      expect(toSnakeCase("hello world")).toBe("hello_world");
    });
  });

  describe("Default Configuration", () => {
    test("should have valid default config", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.wcagLevel).toBe("AA");
      expect(DEFAULT_ACCESSIBILITY_CONFIG.autoFix).toBe(false);
    });

    test("should have contrast config", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG.contrast).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.contrast.minRatioNormalText).toBe(4.5);
      expect(DEFAULT_ACCESSIBILITY_CONFIG.contrast.minRatioLargeText).toBe(3.0);
      expect(DEFAULT_ACCESSIBILITY_CONFIG.contrast.checkDarkMode).toBe(true);
    });

    test("should have touch target config", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG.touchTargets).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.touchTargets.minWidth).toBe(44);
      expect(DEFAULT_ACCESSIBILITY_CONFIG.touchTargets.minHeight).toBe(44);
    });

    test("should have semantics config", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG.semantics).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.semantics.requireImageLabels).toBe(true);
      expect(DEFAULT_ACCESSIBILITY_CONFIG.semantics.requireIconLabels).toBe(true);
      expect(DEFAULT_ACCESSIBILITY_CONFIG.semantics.requireFormLabels).toBe(true);
    });

    test("should have i18n config", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG.i18n).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.i18n.languages).toContain("en");
      expect(DEFAULT_ACCESSIBILITY_CONFIG.i18n.defaultLanguage).toBe("en");
      expect(DEFAULT_ACCESSIBILITY_CONFIG.i18n.useFlutterGen).toBe(true);
    });

    test("should have exclude patterns", () => {
      expect(DEFAULT_ACCESSIBILITY_CONFIG.excludePatterns).toBeDefined();
      expect(DEFAULT_ACCESSIBILITY_CONFIG.excludePatterns).toContain("**/*.g.dart");
    });
  });

  describe("Config Schema Validation", () => {
    test("should validate correct config", () => {
      const result = AccessibilityConfigSchema.safeParse(DEFAULT_ACCESSIBILITY_CONFIG);
      expect(result.success).toBe(true);
    });

    test("should validate all WCAG levels", () => {
      const levels = ["A", "AA", "AAA"];
      levels.forEach((level) => {
        const config = { ...DEFAULT_ACCESSIBILITY_CONFIG, wcagLevel: level };
        const result = AccessibilityConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });

    test("should reject invalid WCAG level", () => {
      const config = { ...DEFAULT_ACCESSIBILITY_CONFIG, wcagLevel: "AAAA" };
      const result = AccessibilityConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("Accessibility Tools", () => {
  describe("Tool Definitions", () => {
    test("should have 4 tools defined", () => {
      expect(ACCESSIBILITY_TOOLS).toHaveLength(4);
    });

    test("should have audit_wcag tool", () => {
      const tool = ACCESSIBILITY_TOOLS.find((t) => t.name === "accessibility_audit_wcag");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("WCAG");
    });

    test("should have generate_fixes tool", () => {
      const tool = ACCESSIBILITY_TOOLS.find((t) => t.name === "accessibility_generate_fixes");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("fixes");
    });

    test("should have setup_i18n tool", () => {
      const tool = ACCESSIBILITY_TOOLS.find((t) => t.name === "accessibility_setup_i18n");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("i18n");
    });

    test("should have generate_translations tool", () => {
      const tool = ACCESSIBILITY_TOOLS.find((t) => t.name === "accessibility_generate_translations");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("translation");
    });

    test("all tools should have required inputSchema properties", () => {
      ACCESSIBILITY_TOOLS.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe("Tool Handlers", () => {
    const createMockContext = () => {
      const projects = new Map<string, ProjectDefinition>();
      const configs = new Map<string, AccessibilityModuleConfig>();

      // Create test project
      const testProject: ProjectDefinition = {
        id: TEST_PROJECT_UUID,
        name: "test_project",
        displayName: "Test Project",
        version: "1.0.0",
        pwa: {
          name: "Test",
          shortName: "Test",
          description: "",
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
        modules: [],
        targets: ["web"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      projects.set(TEST_PROJECT_UUID, testProject);
      configs.set(TEST_PROJECT_UUID, { ...DEFAULT_ACCESSIBILITY_CONFIG });

      return {
        getProject: (id: string) => projects.get(id),
        getAccessibilityConfig: (id: string) => configs.get(id),
        updateAccessibilityConfig: (id: string, config: Partial<AccessibilityModuleConfig>) => {
          const existing = configs.get(id) || { ...DEFAULT_ACCESSIBILITY_CONFIG };
          configs.set(id, { ...existing, ...config });
        },
      };
    };

    describe("accessibility_audit_wcag", () => {
      test("should audit project for WCAG compliance", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_audit_wcag",
          { projectId: TEST_PROJECT_UUID },
          ctx
        );

        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0].text).toContain("WCAG");
        expect(result.content[0].text).toContain("Score:");
      });

      test("should include color contrast check when specified", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_audit_wcag",
          { projectId: TEST_PROJECT_UUID, includeColorContrast: true },
          ctx
        );

        expect(result.content[0].text).toContain("contrast");
      });

      test("should include screen reader check when specified", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_audit_wcag",
          { projectId: TEST_PROJECT_UUID, checkScreenReader: true },
          ctx
        );

        expect(result.content[0].text).toContain("screen");
      });

      test("should throw for non-existent project", async () => {
        const ctx = createMockContext();
        await expect(
          handleAccessibilityTool(
            "accessibility_audit_wcag",
            { projectId: NON_EXISTENT_UUID },
            ctx
          )
        ).rejects.toThrow("Project not found");
      });

      test("should respect custom WCAG level", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_audit_wcag",
          { projectId: TEST_PROJECT_UUID, wcagLevel: "AAA" },
          ctx
        );

        expect(result.content[0].text).toContain("AAA");
      });
    });

    describe("accessibility_generate_fixes", () => {
      test("should generate fixes for issues", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [
              { file: "test.dart", issue: "Missing label", fixType: "semantic" },
            ],
          },
          ctx
        );

        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain("Fixes");
      });

      test("should generate touch target fixes", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [
              { file: "button.dart", issue: "Small touch target", fixType: "touch-target" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("44");
      });

      test("should generate label fixes", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [
              { file: "form.dart", issue: "Missing label", fixType: "label" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("labelText");
      });

      test("should generate focus fixes", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [
              { file: "widget.dart", issue: "Missing focus", fixType: "focus" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("Focus");
      });

      test("should generate contrast fixes", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [
              { file: "theme.dart", issue: "Low contrast", fixType: "contrast" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("Theme");
      });

      test("should indicate auto-apply when specified", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_fixes",
          {
            projectId: TEST_PROJECT_UUID,
            issues: [{ file: "test.dart", issue: "Issue", fixType: "semantic" }],
            autoApply: true,
          },
          ctx
        );

        expect(result.content[0].text).toContain("applied automatically");
      });
    });

    describe("accessibility_setup_i18n", () => {
      test("should setup i18n with languages", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_setup_i18n",
          {
            projectId: TEST_PROJECT_UUID,
            languages: ["en", "es", "fr"],
            defaultLanguage: "en",
          },
          ctx
        );

        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain("i18n Setup Complete");
        expect(result.content[0].text).toContain("en");
        expect(result.content[0].text).toContain("es");
        expect(result.content[0].text).toContain("fr");
      });

      test("should include l10n.yaml content", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_setup_i18n",
          {
            projectId: TEST_PROJECT_UUID,
            languages: ["en"],
            defaultLanguage: "en",
          },
          ctx
        );

        expect(result.content[0].text).toContain("l10n.yaml");
        expect(result.content[0].text).toContain("arb-dir");
      });

      test("should include localization service code", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_setup_i18n",
          {
            projectId: TEST_PROJECT_UUID,
            languages: ["en", "de"],
            defaultLanguage: "en",
          },
          ctx
        );

        expect(result.content[0].text).toContain("LocalizationService");
        expect(result.content[0].text).toContain("supportedLocales");
      });

      test("should update config with i18n settings", async () => {
        const ctx = createMockContext();
        await handleAccessibilityTool(
          "accessibility_setup_i18n",
          {
            projectId: TEST_PROJECT_UUID,
            languages: ["en", "es"],
            defaultLanguage: "en",
          },
          ctx
        );

        const config = ctx.getAccessibilityConfig(TEST_PROJECT_UUID);
        expect(config?.i18n.languages).toContain("en");
        expect(config?.i18n.languages).toContain("es");
      });
    });

    describe("accessibility_generate_translations", () => {
      test("should generate translation keys", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_translations",
          {
            projectId: TEST_PROJECT_UUID,
            keys: [
              { key: "welcomeMessage", defaultValue: "Welcome!", description: "Welcome text" },
              { key: "login", defaultValue: "Login", description: "Login button" },
            ],
          },
          ctx
        );

        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain("Generated Translations");
        expect(result.content[0].text).toContain("welcome_message");
      });

      test("should include ARB entries", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_translations",
          {
            projectId: TEST_PROJECT_UUID,
            keys: [
              { key: "testKey", defaultValue: "Test Value" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("ARB entries");
        expect(result.content[0].text).toContain("test_key");
      });

      test("should include usage example", async () => {
        const ctx = createMockContext();
        const result = await handleAccessibilityTool(
          "accessibility_generate_translations",
          {
            projectId: TEST_PROJECT_UUID,
            keys: [
              { key: "example", defaultValue: "Example" },
            ],
          },
          ctx
        );

        expect(result.content[0].text).toContain("Usage in code");
        expect(result.content[0].text).toContain("AppLocalizations");
      });

      test("should update config with new keys", async () => {
        const ctx = createMockContext();
        await handleAccessibilityTool(
          "accessibility_generate_translations",
          {
            projectId: TEST_PROJECT_UUID,
            keys: [
              { key: "newKey", defaultValue: "New Value" },
            ],
          },
          ctx
        );

        const config = ctx.getAccessibilityConfig(TEST_PROJECT_UUID);
        expect(config?.i18n.translationKeys.length).toBeGreaterThan(0);
      });
    });

    test("should throw for unknown tool", async () => {
      const ctx = createMockContext();
      await expect(
        handleAccessibilityTool("unknown_tool", {}, ctx)
      ).rejects.toThrow("Unknown accessibility tool");
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("Accessibility Module", () => {
  test("should have correct module metadata", () => {
    expect(AccessibilityModule.id).toBe("accessibility");
    expect(AccessibilityModule.name).toBe("Accessibility Module");
    expect(AccessibilityModule.version).toBe("1.0.0");
    expect(AccessibilityModule.description.toLowerCase()).toContain("wcag");
    expect(AccessibilityModule.description.toLowerCase()).toContain("i18n");
  });

  test("should support all platforms", () => {
    expect(AccessibilityModule.compatibleTargets).toContain("web");
    expect(AccessibilityModule.compatibleTargets).toContain("android");
    expect(AccessibilityModule.compatibleTargets).toContain("ios");
    expect(AccessibilityModule.compatibleTargets).toContain("windows");
    expect(AccessibilityModule.compatibleTargets).toContain("macos");
    expect(AccessibilityModule.compatibleTargets).toContain("linux");
  });

  test("should have no dependencies or conflicts", () => {
    expect(AccessibilityModule.dependencies).toEqual([]);
    expect(AccessibilityModule.conflicts).toEqual([]);
  });

  test("should have config schema", () => {
    expect(AccessibilityModule.configSchema).toBeDefined();
  });

  test("should have default config", () => {
    expect(AccessibilityModule.defaultConfig).toBeDefined();
  });

  test("should have hooks", () => {
    expect(AccessibilityModule.hooks).toBeDefined();
    expect(AccessibilityModule.hooks).toBe(accessibilityHooks);
  });

  test("should have templates", () => {
    expect(AccessibilityModule.templates).toBeDefined();
    expect(AccessibilityModule.templates).toBe(ACCESSIBILITY_TEMPLATES);
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Accessibility Hooks", () => {
  test("should have onInstall hook", () => {
    expect(accessibilityHooks.onInstall).toBeDefined();
    expect(typeof accessibilityHooks.onInstall).toBe("function");
  });

  test("should have beforeGenerate hook", () => {
    expect(accessibilityHooks.beforeGenerate).toBeDefined();
    expect(typeof accessibilityHooks.beforeGenerate).toBe("function");
  });

  test("should have onGenerate hook", () => {
    expect(accessibilityHooks.onGenerate).toBeDefined();
    expect(typeof accessibilityHooks.onGenerate).toBe("function");
  });

  test("should have afterGenerate hook", () => {
    expect(accessibilityHooks.afterGenerate).toBeDefined();
    expect(typeof accessibilityHooks.afterGenerate).toBe("function");
  });

  test("should have beforeBuild hook", () => {
    expect(accessibilityHooks.beforeBuild).toBeDefined();
    expect(typeof accessibilityHooks.beforeBuild).toBe("function");
  });

  test("should have afterBuild hook", () => {
    expect(accessibilityHooks.afterBuild).toBeDefined();
    expect(typeof accessibilityHooks.afterBuild).toBe("function");
  });
});

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

describe("Accessibility Templates", () => {
  test("should have 5 templates", () => {
    expect(ACCESSIBILITY_TEMPLATES).toHaveLength(5);
  });

  test("should have accessibility widget template", () => {
    const template = ACCESSIBILITY_TEMPLATES.find((t) => t.id === "accessibility-widget");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Accessible Widget");
    expect(template?.type).toBe("file");
  });

  test("should have localization service template", () => {
    const template = ACCESSIBILITY_TEMPLATES.find((t) => t.id === "accessibility-localization-service");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Localization Service");
  });

  test("should have ARB file template", () => {
    const template = ACCESSIBILITY_TEMPLATES.find((t) => t.id === "accessibility-arb-file");
    expect(template).toBeDefined();
    expect(template?.name).toBe("ARB Translation File");
    expect(template?.output.extension).toBe("arb");
  });

  test("should have semantic heading template", () => {
    const template = ACCESSIBILITY_TEMPLATES.find((t) => t.id === "accessibility-semantic-heading");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Semantic Heading");
  });

  test("should have audit report template", () => {
    const template = ACCESSIBILITY_TEMPLATES.find((t) => t.id === "accessibility-audit-report");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Accessibility Audit Report");
    expect(template?.output.extension).toBe("md");
  });

  test("all templates should have required properties", () => {
    ACCESSIBILITY_TEMPLATES.forEach((template) => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.type).toBeDefined();
      expect(template.source).toBeDefined();
      expect(template.output).toBeDefined();
      expect(template.output.path).toBeDefined();
      expect(template.output.filename).toBeDefined();
      expect(template.output.extension).toBeDefined();
    });
  });
});

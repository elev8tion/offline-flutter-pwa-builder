/**
 * Testing Module Tests
 */

import {
  TestingModuleConfig,
  DEFAULT_TESTING_CONFIG,
  TestingConfigSchema,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  fileNameToClassName,
  classNameToFileName,
  TestType,
  CoverageLevel,
} from "../src/modules/testing/config.js";
import {
  TestingModule,
  TESTING_TOOLS,
  handleTestingTool,
} from "../src/modules/testing/index.js";
import { testingHooks } from "../src/modules/testing/hooks.js";
import { TESTING_TEMPLATES } from "../src/modules/testing/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

describe("Testing Config", () => {
  describe("Case Conversion Utilities", () => {
    test("toPascalCase should convert snake_case correctly", () => {
      expect(toPascalCase("user_service")).toBe("UserService");
      expect(toPascalCase("todo_repository")).toBe("TodoRepository");
      expect(toPascalCase("test")).toBe("Test");
    });

    test("toPascalCase should convert kebab-case correctly", () => {
      expect(toPascalCase("user-service")).toBe("UserService");
      expect(toPascalCase("my-component")).toBe("MyComponent");
    });

    test("toPascalCase should handle single words", () => {
      expect(toPascalCase("user")).toBe("User");
      expect(toPascalCase("test")).toBe("Test");
    });

    test("toCamelCase should convert snake_case correctly", () => {
      expect(toCamelCase("user_service")).toBe("userService");
      expect(toCamelCase("todo_repository")).toBe("todoRepository");
      expect(toCamelCase("test")).toBe("test");
    });

    test("toCamelCase should convert kebab-case correctly", () => {
      expect(toCamelCase("user-service")).toBe("userService");
      expect(toCamelCase("my-component")).toBe("myComponent");
    });

    test("toSnakeCase should convert PascalCase correctly", () => {
      expect(toSnakeCase("UserService")).toBe("user_service");
      expect(toSnakeCase("TodoRepository")).toBe("todo_repository");
    });

    test("toSnakeCase should convert camelCase correctly", () => {
      expect(toSnakeCase("userService")).toBe("user_service");
      expect(toSnakeCase("todoRepository")).toBe("todo_repository");
    });

    test("toSnakeCase should handle leading uppercase", () => {
      expect(toSnakeCase("Test")).toBe("test");
      expect(toSnakeCase("URL")).toBe("u_r_l");
    });
  });

  describe("File/Class Name Conversion", () => {
    test("fileNameToClassName should convert correctly", () => {
      expect(fileNameToClassName("user_service.dart")).toBe("UserService");
      expect(fileNameToClassName("todo_repository.dart")).toBe("TodoRepository");
      expect(fileNameToClassName("main.dart")).toBe("Main");
    });

    test("fileNameToClassName should handle non-.dart files", () => {
      expect(fileNameToClassName("user_service")).toBe("UserService");
    });

    test("classNameToFileName should convert correctly", () => {
      expect(classNameToFileName("UserService")).toBe("user_service.dart");
      expect(classNameToFileName("TodoRepository")).toBe("todo_repository.dart");
    });
  });

  describe("Default Config", () => {
    test("should have valid default values", () => {
      expect(DEFAULT_TESTING_CONFIG.defaultCoverage).toBe(80);
      expect(DEFAULT_TESTING_CONFIG.generateMocks).toBe(true);
      expect(DEFAULT_TESTING_CONFIG.useMockito).toBe(true);
      expect(DEFAULT_TESTING_CONFIG.useGoldenToolkit).toBe(false);
    });

    test("should have correct directories", () => {
      expect(DEFAULT_TESTING_CONFIG.testDirectory).toBe("test");
      expect(DEFAULT_TESTING_CONFIG.integrationTestDirectory).toBe("integration_test");
      expect(DEFAULT_TESTING_CONFIG.goldenDirectory).toBe("test/golden");
    });

    test("should have empty suites array", () => {
      expect(DEFAULT_TESTING_CONFIG.suites).toEqual([]);
    });

    test("should have exclude patterns", () => {
      expect(DEFAULT_TESTING_CONFIG.excludePatterns).toContain("**/*.g.dart");
      expect(DEFAULT_TESTING_CONFIG.excludePatterns).toContain("**/*.freezed.dart");
    });

    test("should have coverage exclusions", () => {
      expect(DEFAULT_TESTING_CONFIG.coverageExclusions).toContain("lib/generated/**");
      expect(DEFAULT_TESTING_CONFIG.coverageExclusions).toContain("lib/**/*.g.dart");
      expect(DEFAULT_TESTING_CONFIG.coverageExclusions).toContain("lib/**/*.freezed.dart");
    });
  });

  describe("Schema Validation", () => {
    test("should validate valid config", () => {
      const result = TestingConfigSchema.safeParse(DEFAULT_TESTING_CONFIG);
      expect(result.success).toBe(true);
    });

    test("should validate config with test suites", () => {
      const config: TestingModuleConfig = {
        ...DEFAULT_TESTING_CONFIG,
        suites: [
          {
            targetFile: "lib/services/user_service.dart",
            className: "UserService",
            testType: "unit",
            mocks: [
              { className: "ApiClient", methods: ["get", "post"], properties: ["baseUrl"] },
            ],
            methods: [
              { name: "fetchUser", async: true, expectationType: "notNull" },
            ],
          },
        ],
      };
      const result = TestingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test("should validate config with different coverage levels", () => {
      const coverageLevels: CoverageLevel[] = [70, 80, 90, 100];
      for (const coverage of coverageLevels) {
        const config = { ...DEFAULT_TESTING_CONFIG, defaultCoverage: coverage };
        const result = TestingConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });

    test("should reject invalid coverage level", () => {
      const config = { ...DEFAULT_TESTING_CONFIG, defaultCoverage: 50 };
      const result = TestingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should validate different test types", () => {
      const testTypes: TestType[] = ["unit", "widget", "integration", "golden"];
      for (const testType of testTypes) {
        const config: TestingModuleConfig = {
          ...DEFAULT_TESTING_CONFIG,
          suites: [
            {
              targetFile: "lib/test.dart",
              className: "Test",
              testType,
              mocks: [],
              methods: [],
            },
          ],
        };
        const result = TestingConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("Testing Module", () => {
  test("should have correct module metadata", () => {
    expect(TestingModule.id).toBe("testing");
    expect(TestingModule.name).toBe("Testing Module");
    expect(TestingModule.version).toBe("1.0.0");
    expect(TestingModule.description).toContain("unit");
    expect(TestingModule.description).toContain("widget");
    expect(TestingModule.description).toContain("integration");
  });

  test("should support all platforms", () => {
    expect(TestingModule.compatibleTargets).toContain("web");
    expect(TestingModule.compatibleTargets).toContain("android");
    expect(TestingModule.compatibleTargets).toContain("ios");
    expect(TestingModule.compatibleTargets).toContain("windows");
    expect(TestingModule.compatibleTargets).toContain("macos");
    expect(TestingModule.compatibleTargets).toContain("linux");
  });

  test("should have no dependencies or conflicts", () => {
    expect(TestingModule.dependencies).toEqual([]);
    expect(TestingModule.conflicts).toEqual([]);
  });

  test("should have templates", () => {
    expect(TestingModule.templates).toBeDefined();
    expect(TestingModule.templates.length).toBeGreaterThan(0);
  });

  test("should have hooks", () => {
    expect(TestingModule.hooks).toBeDefined();
    expect(TestingModule.hooks.onInstall).toBeDefined();
    expect(TestingModule.hooks.beforeGenerate).toBeDefined();
    expect(TestingModule.hooks.onGenerate).toBeDefined();
    expect(TestingModule.hooks.afterGenerate).toBeDefined();
    expect(TestingModule.hooks.beforeBuild).toBeDefined();
    expect(TestingModule.hooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("Testing Tools", () => {
  test("should define all tools", () => {
    expect(TESTING_TOOLS.length).toBe(6);

    const toolNames = TESTING_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("testing_generate_unit");
    expect(toolNames).toContain("testing_generate_widget");
    expect(toolNames).toContain("testing_generate_integration");
    expect(toolNames).toContain("testing_generate_mocks");
    expect(toolNames).toContain("testing_configure_coverage");
    expect(toolNames).toContain("testing_run_with_coverage");
  });

  test("testing_generate_unit should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_generate_unit");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("targetFile");
    expect(tool?.inputSchema.properties).toHaveProperty("testType");
    expect(tool?.inputSchema.properties).toHaveProperty("coverage");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("targetFile");
    expect(tool?.inputSchema.required).toContain("testType");
  });

  test("testing_generate_widget should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_generate_widget");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("widgetFile");
    expect(tool?.inputSchema.properties).toHaveProperty("includeGolden");
    expect(tool?.inputSchema.properties).toHaveProperty("includeAccessibility");
    expect(tool?.inputSchema.properties).toHaveProperty("includeResponsive");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("widgetFile");
  });

  test("testing_generate_integration should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_generate_integration");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("flowName");
    expect(tool?.inputSchema.properties).toHaveProperty("steps");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("flowName");
    expect(tool?.inputSchema.required).toContain("steps");
  });

  test("testing_generate_mocks should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_generate_mocks");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("classes");
    expect(tool?.inputSchema.properties).toHaveProperty("outputFile");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("classes");
  });

  test("testing_configure_coverage should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_configure_coverage");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("minimumCoverage");
    expect(tool?.inputSchema.properties).toHaveProperty("excludePatterns");
    expect(tool?.inputSchema.properties).toHaveProperty("criticalPaths");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("minimumCoverage");
  });

  test("testing_run_with_coverage should have correct schema", () => {
    const tool = TESTING_TOOLS.find((t) => t.name === "testing_run_with_coverage");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("testType");
    expect(tool?.inputSchema.properties).toHaveProperty("generateReport");
    expect(tool?.inputSchema.required).toContain("projectId");
  });
});

describe("Testing Tool Handlers", () => {
  let mockProject: ProjectDefinition;

  const getMockContext = () => ({
    getProject: (id: string) => (id === TEST_PROJECT_UUID ? mockProject : undefined),
    updateProject: async (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
      return mockProject;
    },
    getTestingConfig: (projectId: string) => {
      if (projectId !== TEST_PROJECT_UUID) return undefined;
      const moduleConfig = mockProject.modules.find((m) => m.id === "testing");
      return moduleConfig?.config as TestingModuleConfig | undefined;
    },
    updateTestingConfig: (_projectId: string, config: Partial<TestingModuleConfig>) => {
      const moduleIndex = mockProject.modules.findIndex((m) => m.id === "testing");
      if (moduleIndex >= 0) {
        mockProject.modules[moduleIndex].config = {
          ...mockProject.modules[moduleIndex].config,
          ...config,
        };
      } else {
        mockProject.modules.push({
          id: "testing",
          enabled: true,
          config: config,
        });
      }
    },
  });

  beforeEach(() => {
    const freshTestingConfig: TestingModuleConfig = {
      ...DEFAULT_TESTING_CONFIG,
      suites: [],
      excludePatterns: [...DEFAULT_TESTING_CONFIG.excludePatterns],
      coverageExclusions: [...DEFAULT_TESTING_CONFIG.coverageExclusions],
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
          id: "testing",
          enabled: true,
          config: freshTestingConfig as unknown as Record<string, unknown>,
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  test("testing_generate_unit should generate unit test code", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_unit",
      {
        projectId: TEST_PROJECT_UUID,
        targetFile: "lib/services/user_service.dart",
        testType: "unit",
        coverage: 90,
      },
      mockContext
    );

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("unit tests");
    expect(result.content[0].text).toContain("UserService");
    expect(result.content[0].text).toContain("Coverage Target: 90%");
    expect(result.content[0].text).toContain("flutter_test/flutter_test.dart");
    expect(result.content[0].text).toContain("mockito");
  });

  test("testing_generate_unit should generate widget test code", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_unit",
      {
        projectId: TEST_PROJECT_UUID,
        targetFile: "lib/widgets/custom_button.dart",
        testType: "widget",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("widget tests");
    expect(result.content[0].text).toContain("CustomButton");
    expect(result.content[0].text).toContain("testWidgets");
    expect(result.content[0].text).toContain("pumpWidget");
  });

  test("testing_generate_unit should generate integration test code", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_unit",
      {
        projectId: TEST_PROJECT_UUID,
        targetFile: "lib/screens/home_screen.dart",
        testType: "integration",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("integration tests");
    expect(result.content[0].text).toContain("HomeScreen");
    expect(result.content[0].text).toContain("IntegrationTestWidgetsFlutterBinding");
  });

  test("testing_generate_widget should generate comprehensive widget tests", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_widget",
      {
        projectId: TEST_PROJECT_UUID,
        widgetFile: "lib/widgets/profile_card.dart",
        includeGolden: true,
        includeAccessibility: true,
        includeResponsive: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("ProfileCard");
    expect(result.content[0].text).toContain("Accessibility");
    expect(result.content[0].text).toContain("Responsive");
    expect(result.content[0].text).toContain("Golden");
    expect(result.content[0].text).toContain("golden_toolkit");
    expect(result.content[0].text).toContain("semantics");
    expect(result.content[0].text).toContain("setSurfaceSize");
  });

  test("testing_generate_integration should generate flow-based tests", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_integration",
      {
        projectId: TEST_PROJECT_UUID,
        flowName: "user_login",
        steps: [
          { action: "tap", target: "Login Button" },
          { action: "enter_text", target: "Email Field", value: "test@example.com" },
          { action: "enter_text", target: "Password Field", value: "password123" },
          { action: "tap", target: "Submit Button" },
          { action: "wait", target: "Loading", duration: 2000 },
          { action: "verify_text", target: "Welcome" },
        ],
      },
      mockContext
    );

    expect(result.content[0].text).toContain("user_login");
    expect(result.content[0].text).toContain("Steps:");
    expect(result.content[0].text).toContain("tap: Login Button");
    expect(result.content[0].text).toContain("enter_text: Email Field");
    expect(result.content[0].text).toContain("tester.tap");
    expect(result.content[0].text).toContain("tester.enterText");
    expect(result.content[0].text).toContain("tester.pump");
  });

  test("testing_generate_mocks should generate Mockito mock code", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_generate_mocks",
      {
        projectId: TEST_PROJECT_UUID,
        classes: ["UserRepository", "ApiClient", "AuthService"],
        outputFile: "test/helpers/mocks.dart",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("3 classes");
    expect(result.content[0].text).toContain("MockUserRepository");
    expect(result.content[0].text).toContain("MockApiClient");
    expect(result.content[0].text).toContain("MockAuthService");
    expect(result.content[0].text).toContain("@GenerateMocks");
    expect(result.content[0].text).toContain("build_runner build");
  });

  test("testing_configure_coverage should update coverage config", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_configure_coverage",
      {
        projectId: TEST_PROJECT_UUID,
        minimumCoverage: 90,
        excludePatterns: ["lib/generated/**", "lib/**/*.g.dart"],
        criticalPaths: ["lib/core/**", "lib/services/**"],
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Coverage configured");
    expect(result.content[0].text).toContain("90%");
    expect(result.content[0].text).toContain("Critical Paths");
    expect(result.content[0].text).toContain("lib/core/**");

    const config = mockContext.getTestingConfig(TEST_PROJECT_UUID);
    expect(config?.defaultCoverage).toBe(90);
  });

  test("testing_run_with_coverage should generate run commands", async () => {
    const mockContext = getMockContext();
    const result = await handleTestingTool(
      "testing_run_with_coverage",
      {
        projectId: TEST_PROJECT_UUID,
        testType: "all",
        generateReport: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("flutter test");
    expect(result.content[0].text).toContain("--coverage");
    expect(result.content[0].text).toContain("genhtml");
    expect(result.content[0].text).toContain("coverage/html");
  });

  test("should throw error for non-existent project", async () => {
    const mockContext = getMockContext();
    await expect(
      handleTestingTool(
        "testing_generate_unit",
        {
          projectId: NON_EXISTENT_UUID,
          targetFile: "lib/test.dart",
          testType: "unit",
        },
        mockContext
      )
    ).rejects.toThrow(/not found/);
  });

  test("should handle unknown testing tool", async () => {
    const mockContext = getMockContext();
    await expect(
      handleTestingTool(
        "testing_unknown_tool",
        { projectId: TEST_PROJECT_UUID },
        mockContext
      )
    ).rejects.toThrow(/Unknown testing tool/);
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Testing Hooks", () => {
  test("should have all required hooks", () => {
    expect(testingHooks.onInstall).toBeDefined();
    expect(testingHooks.beforeGenerate).toBeDefined();
    expect(testingHooks.onGenerate).toBeDefined();
    expect(testingHooks.afterGenerate).toBeDefined();
    expect(testingHooks.beforeBuild).toBeDefined();
    expect(testingHooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// TEMPLATES TESTS
// ============================================================================

describe("Testing Templates", () => {
  test("should have all required templates", () => {
    expect(TESTING_TEMPLATES.length).toBe(6);

    const templateIds = TESTING_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain("testing-unit-test");
    expect(templateIds).toContain("testing-widget-test");
    expect(templateIds).toContain("testing-integration-test");
    expect(templateIds).toContain("testing-mock-file");
    expect(templateIds).toContain("testing-helpers");
    expect(templateIds).toContain("testing-pubspec-additions");
  });

  test("templates should have correct structure", () => {
    for (const template of TESTING_TEMPLATES) {
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

  test("unit test template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-unit-test");
    expect(template).toBeDefined();
    expect(template?.source).toContain("flutter_test");
    expect(template?.source).toContain("mockito");
    expect(template?.source).toContain("@GenerateMocks");
    expect(template?.source).toContain("setUp");
    expect(template?.source).toContain("tearDown");
  });

  test("widget test template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-widget-test");
    expect(template).toBeDefined();
    expect(template?.source).toContain("testWidgets");
    expect(template?.source).toContain("pumpWidget");
    expect(template?.source).toContain("MaterialApp");
    expect(template?.source).toContain("findsOneWidget");
  });

  test("integration test template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-integration-test");
    expect(template).toBeDefined();
    expect(template?.source).toContain("integration_test");
    expect(template?.source).toContain("IntegrationTestWidgetsFlutterBinding");
    expect(template?.source).toContain("pumpAndSettle");
  });

  test("mock file template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-mock-file");
    expect(template).toBeDefined();
    expect(template?.source).toContain("@GenerateMocks");
    expect(template?.source).toContain("mockito/annotations.dart");
  });

  test("helpers template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-helpers");
    expect(template).toBeDefined();
    expect(template?.source).toContain("wrapWithMaterialApp");
    expect(template?.source).toContain("testKey");
    expect(template?.source).toContain("pumpAndSettleWithTimeout");
  });

  test("pubspec additions template should have valid content", () => {
    const template = TESTING_TEMPLATES.find((t) => t.id === "testing-pubspec-additions");
    expect(template).toBeDefined();
    expect(template?.source).toContain("flutter_test");
    expect(template?.source).toContain("mockito");
    expect(template?.source).toContain("build_runner");
  });
});

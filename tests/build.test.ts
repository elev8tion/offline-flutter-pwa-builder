/**
 * Build Module Tests
 *
 * Comprehensive test suite for the Build Module including:
 * - Configuration validation
 * - Tool handlers
 * - Hooks
 * - Templates
 */

// Jest is globally available - no import needed
import type { ProjectDefinition } from "../src/core/types.js";
import {
  BUILD_MODULE,
  DEFAULT_BUILD_CONFIG,
  BuildModuleConfig,
  BuildModuleConfigSchema,
  DeploymentConfigSchema,
  OptimizationConfigSchema,
  EnvironmentConfigSchema,
  LocalDevelopmentConfigSchema,
  CIPipelineConfigSchema,
  ReleaseConfigSchema,
  getFlutterBuildCommand,
  getFlutterServeCommand,
  getDefaultSecurityHeaders,
  getPWAHeaders,
  generateCacheVersion,
  getBuildSizeCategory,
  DEPLOYMENT_PLATFORMS,
  CI_PROVIDERS,
  NETWORK_PRESETS,
  OPTIMIZATION_PRESETS,
  getOptimizationPreset,
  getDeploymentInstructions,
  BUILD_TEMPLATES,
  BUILD_TOOLS,
  buildHooks,
} from "../src/modules/build/index.js";
import {
  handleProjectCreate,
  handleProjectBuild,
  handleProjectServe,
  handleProjectDeploy,
  handleConfigureDeployment,
  handleProjectValidate,
  handleProjectExport,
  handleTestOffline,
  handleProjectAudit,
  handleConfigureCICD,
  handleBuildTool,
  type BuildToolContext,
} from "../src/modules/build/tools.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";

let mockProject: ProjectDefinition;

const getMockContext = (): BuildToolContext => ({
  getProject: (id: string) => (id === TEST_PROJECT_UUID ? mockProject : undefined),
  updateProject: (_id: string, updates: Partial<ProjectDefinition>) => {
    Object.assign(mockProject, updates);
  },
  getBuildConfig: (projectId: string) => {
    if (projectId !== TEST_PROJECT_UUID) return undefined;
    const moduleConfig = mockProject.modules.find((m) => m.id === "build");
    return moduleConfig?.config as BuildModuleConfig | undefined;
  },
  updateBuildConfig: (_projectId: string, config: Partial<BuildModuleConfig>) => {
    const moduleIndex = mockProject.modules.findIndex((m) => m.id === "build");
    if (moduleIndex >= 0) {
      mockProject.modules[moduleIndex].config = {
        ...mockProject.modules[moduleIndex].config,
        ...config,
      };
    } else {
      mockProject.modules.push({
        id: "build",
        enabled: true,
        config: config as unknown as Record<string, unknown>,
      });
    }
  },
});

beforeEach(() => {
  mockProject = {
    id: TEST_PROJECT_UUID,
    name: "test_pwa",
    displayName: "Test PWA",
    version: "1.0.0",
    pwa: {
      name: "Test PWA",
      shortName: "Test",
      description: "A test PWA application",
      themeColor: "#2196F3",
      backgroundColor: "#FFFFFF",
      display: "standalone",
      orientation: "any",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      startUrl: "/",
      scope: "/",
    },
    offline: {
      strategy: "offline-first",
      storage: {
        type: "drift",
        encryption: false,
      },
      caching: {
        assets: true,
        api: true,
        ttl: 86400,
      },
      sync: {
        enabled: true,
        strategy: "auto",
      },
    },
    architecture: "feature-first",
    stateManagement: "riverpod",
    modules: [
      {
        id: "build",
        enabled: true,
        config: DEFAULT_BUILD_CONFIG as unknown as Record<string, unknown>,
      },
    ],
    targets: ["web", "android", "ios"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
});

// ============================================================================
// MODULE DEFINITION TESTS
// ============================================================================

describe("Build Module Definition", () => {
  it("should have correct module properties", () => {
    expect(BUILD_MODULE.id).toBe("build");
    expect(BUILD_MODULE.name).toBe("Build & Deploy");
    expect(BUILD_MODULE.version).toBe("1.0.0");
    expect(BUILD_MODULE.description).toContain("Build optimization");
  });

  it("should be compatible with all targets", () => {
    expect(BUILD_MODULE.compatibleTargets).toContain("web");
    expect(BUILD_MODULE.compatibleTargets).toContain("android");
    expect(BUILD_MODULE.compatibleTargets).toContain("ios");
    expect(BUILD_MODULE.compatibleTargets).toContain("windows");
    expect(BUILD_MODULE.compatibleTargets).toContain("macos");
    expect(BUILD_MODULE.compatibleTargets).toContain("linux");
  });

  it("should have templates defined", () => {
    expect(BUILD_MODULE.templates.length).toBeGreaterThan(0);
    expect(BUILD_MODULE.templates.some((t) => t.id === "vercel_config")).toBe(true);
    expect(BUILD_MODULE.templates.some((t) => t.id === "netlify_config")).toBe(true);
    expect(BUILD_MODULE.templates.some((t) => t.id === "firebase_config")).toBe(true);
  });

  it("should have hooks defined", () => {
    expect(BUILD_MODULE.hooks).toBeDefined();
    expect(BUILD_MODULE.hooks.onInstall).toBeDefined();
    expect(BUILD_MODULE.hooks.beforeGenerate).toBeDefined();
    expect(BUILD_MODULE.hooks.onGenerate).toBeDefined();
    expect(BUILD_MODULE.hooks.beforeBuild).toBeDefined();
    expect(BUILD_MODULE.hooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// CONFIGURATION SCHEMA TESTS
// ============================================================================

describe("Build Module Configuration Schema", () => {
  describe("DeploymentConfigSchema", () => {
    it("should accept valid deployment config", () => {
      const config = { platform: "vercel" };
      const result = DeploymentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept all valid platforms", () => {
      const platforms = ["vercel", "netlify", "firebase", "github-pages", "custom"];
      platforms.forEach((platform) => {
        const result = DeploymentConfigSchema.safeParse({ platform });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid platform", () => {
      const result = DeploymentConfigSchema.safeParse({ platform: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("OptimizationConfigSchema", () => {
    it("should accept valid optimization config", () => {
      const config = {
        treeShake: true,
        minify: true,
        sourceMaps: false,
        webRenderer: "auto",
      };
      const result = OptimizationConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept all valid web renderers", () => {
      const renderers = ["html", "canvaskit", "auto"];
      renderers.forEach((webRenderer) => {
        const result = OptimizationConfigSchema.safeParse({ webRenderer });
        expect(result.success).toBe(true);
      });
    });

    it("should use defaults for missing properties", () => {
      const result = OptimizationConfigSchema.parse({});
      expect(result.treeShake).toBe(true);
      expect(result.minify).toBe(true);
      expect(result.sourceMaps).toBe(false);
    });
  });

  describe("EnvironmentConfigSchema", () => {
    it("should accept valid environment config", () => {
      const config = {
        mode: "production",
        variables: [
          { name: "API_URL", value: "https://api.example.com", required: true, secret: false },
        ],
      };
      const result = EnvironmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept all valid modes", () => {
      const modes = ["development", "staging", "production"];
      modes.forEach((mode) => {
        const result = EnvironmentConfigSchema.safeParse({ mode });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("LocalDevelopmentConfigSchema", () => {
    it("should accept valid local dev config", () => {
      const config = {
        server: {
          port: 8080,
          host: "localhost",
          https: false,
          hotReload: true,
          openBrowser: true,
          webRenderer: "html",
          debugMode: true,
        },
        offlineTest: {
          enabled: false,
          simulateLatency: 0,
          cacheStrategy: "cache-first",
          blockNetworkRequests: false,
        },
        lighthouse: {
          enabled: true,
          categories: ["performance", "pwa"],
          outputFormat: "html",
          outputPath: "./lighthouse-report",
          thresholds: {},
        },
        databaseInspector: true,
        serviceWorkerTools: true,
      };
      const result = LocalDevelopmentConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate port range", () => {
      // Test with complete LocalDevelopmentConfig - port validation is in DevServerConfigSchema
      // Port must be between 1024 and 65535
      const validConfig = {
        server: { port: 8080, host: "localhost", https: false, hotReload: true, openBrowser: true, webRenderer: "html", debugMode: true },
        offlineTest: { enabled: true, scenarios: ["offline"], networkThrottle: {} },
        lighthouse: { enabled: true, categories: ["performance", "pwa"], thresholds: {} },
        databaseInspector: true,
        serviceWorkerTools: true,
      };
      const invalidLowConfig = {
        ...validConfig,
        server: { ...validConfig.server, port: 80 },
      };
      const invalidHighConfig = {
        ...validConfig,
        server: { ...validConfig.server, port: 99999 },
      };

      expect(LocalDevelopmentConfigSchema.safeParse(validConfig).success).toBe(true);
      expect(LocalDevelopmentConfigSchema.safeParse(invalidLowConfig).success).toBe(false);
      expect(LocalDevelopmentConfigSchema.safeParse(invalidHighConfig).success).toBe(false);
    });
  });

  describe("CIPipelineConfigSchema", () => {
    it("should accept valid CI/CD config", () => {
      const config = {
        provider: "github-actions",
        triggers: {
          branches: ["main", "develop"],
          pullRequest: true,
        },
        stages: [
          { name: "build", commands: ["flutter build web"] },
        ],
        caching: true,
      };
      const result = CIPipelineConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept all valid CI providers", () => {
      const providers = ["github-actions", "gitlab-ci", "bitbucket", "azure-pipelines"];
      providers.forEach((provider) => {
        const result = CIPipelineConfigSchema.safeParse({
          provider,
          triggers: { branches: ["main"] },
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("ReleaseConfigSchema", () => {
    it("should accept valid release config", () => {
      const config = {
        versioning: "semver",
        autoIncrement: true,
        changelog: true,
        tagPrefix: "v",
      };
      const result = ReleaseConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept all versioning strategies", () => {
      const strategies = ["semver", "date", "build-number"];
      strategies.forEach((versioning) => {
        const result = ReleaseConfigSchema.safeParse({ versioning });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("BuildModuleConfigSchema", () => {
    it("should validate complete config", () => {
      const result = BuildModuleConfigSchema.safeParse(DEFAULT_BUILD_CONFIG);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// DEFAULT CONFIG TESTS
// ============================================================================

describe("Default Build Configuration", () => {
  it("should have valid default deployment platform", () => {
    expect(DEFAULT_BUILD_CONFIG.deployment.platform).toBe("vercel");
  });

  it("should have valid default optimization settings", () => {
    expect(DEFAULT_BUILD_CONFIG.optimization.treeShake).toBe(true);
    expect(DEFAULT_BUILD_CONFIG.optimization.minify).toBe(true);
    expect(DEFAULT_BUILD_CONFIG.optimization.sourceMaps).toBe(false);
    expect(DEFAULT_BUILD_CONFIG.optimization.webRenderer).toBe("auto");
  });

  it("should have valid default environment", () => {
    expect(DEFAULT_BUILD_CONFIG.environment.mode).toBe("development");
    expect(DEFAULT_BUILD_CONFIG.environment.variables).toEqual([]);
  });

  it("should have valid default local dev settings", () => {
    expect(DEFAULT_BUILD_CONFIG.localDev.server.port).toBe(8080);
    expect(DEFAULT_BUILD_CONFIG.localDev.server.host).toBe("localhost");
    expect(DEFAULT_BUILD_CONFIG.localDev.server.hotReload).toBe(true);
    expect(DEFAULT_BUILD_CONFIG.localDev.lighthouse.enabled).toBe(true);
  });

  it("should have valid default release settings", () => {
    expect(DEFAULT_BUILD_CONFIG.release.versioning).toBe("semver");
    expect(DEFAULT_BUILD_CONFIG.release.autoIncrement).toBe(true);
    expect(DEFAULT_BUILD_CONFIG.release.tagPrefix).toBe("v");
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe("Helper Functions", () => {
  describe("getFlutterBuildCommand", () => {
    it("should generate production build command", () => {
      const config: BuildModuleConfig = {
        ...DEFAULT_BUILD_CONFIG,
        environment: { ...DEFAULT_BUILD_CONFIG.environment, mode: "production" },
      };
      const command = getFlutterBuildCommand(config);
      expect(command).toContain("flutter build web");
      expect(command).toContain("--release");
    });

    it("should include web renderer flag when specified", () => {
      const config: BuildModuleConfig = {
        ...DEFAULT_BUILD_CONFIG,
        optimization: { ...DEFAULT_BUILD_CONFIG.optimization, webRenderer: "canvaskit" },
      };
      const command = getFlutterBuildCommand(config);
      expect(command).toContain("--web-renderer=canvaskit");
    });

    it("should include source maps flag when enabled", () => {
      const config: BuildModuleConfig = {
        ...DEFAULT_BUILD_CONFIG,
        optimization: { ...DEFAULT_BUILD_CONFIG.optimization, sourceMaps: true },
      };
      const command = getFlutterBuildCommand(config);
      expect(command).toContain("--source-maps");
    });

    it("should include tree shake flag when enabled", () => {
      const config: BuildModuleConfig = {
        ...DEFAULT_BUILD_CONFIG,
        optimization: { ...DEFAULT_BUILD_CONFIG.optimization, treeShake: true },
      };
      const command = getFlutterBuildCommand(config);
      expect(command).toContain("--tree-shake-icons");
    });
  });

  describe("getFlutterServeCommand", () => {
    it("should generate dev server command", () => {
      const command = getFlutterServeCommand(DEFAULT_BUILD_CONFIG.localDev.server);
      expect(command).toContain("flutter run -d chrome");
      expect(command).toContain("--web-port=8080");
    });

    it("should include renderer when specified", () => {
      const serverConfig = { ...DEFAULT_BUILD_CONFIG.localDev.server, webRenderer: "html" as const };
      const command = getFlutterServeCommand(serverConfig);
      expect(command).toContain("--web-renderer=html");
    });

    it("should include debug flag when enabled", () => {
      const serverConfig = { ...DEFAULT_BUILD_CONFIG.localDev.server, debugMode: true };
      const command = getFlutterServeCommand(serverConfig);
      expect(command).toContain("--debug");
    });
  });

  describe("getDefaultSecurityHeaders", () => {
    it("should return security headers", () => {
      const headers = getDefaultSecurityHeaders();
      expect(headers.length).toBeGreaterThan(0);
      expect(headers.some((h) => h.key === "X-Content-Type-Options")).toBe(true);
      expect(headers.some((h) => h.key === "X-Frame-Options")).toBe(true);
      expect(headers.some((h) => h.key === "X-XSS-Protection")).toBe(true);
    });
  });

  describe("getPWAHeaders", () => {
    it("should return PWA-specific headers", () => {
      const headers = getPWAHeaders();
      expect(headers.length).toBeGreaterThan(0);
      expect(headers.some((h) => h.key === "Service-Worker-Allowed")).toBe(true);
    });
  });

  describe("generateCacheVersion", () => {
    it("should generate a version string", () => {
      const version = generateCacheVersion();
      expect(typeof version).toBe("string");
      expect(version.length).toBeGreaterThan(0);
    });

    it("should include date components", () => {
      const version = generateCacheVersion();
      expect(version).toMatch(/\d+\.\d+\.\d+-\d+/);
    });
  });

  describe("getBuildSizeCategory", () => {
    it("should categorize small builds", () => {
      expect(getBuildSizeCategory(1 * 1024 * 1024)).toBe("small"); // 1 MB
    });

    it("should categorize medium builds", () => {
      expect(getBuildSizeCategory(3 * 1024 * 1024)).toBe("medium"); // 3 MB
    });

    it("should categorize large builds", () => {
      expect(getBuildSizeCategory(7 * 1024 * 1024)).toBe("large"); // 7 MB
    });

    it("should categorize excessive builds", () => {
      expect(getBuildSizeCategory(15 * 1024 * 1024)).toBe("excessive"); // 15 MB
    });
  });

  describe("getOptimizationPreset", () => {
    it("should return development preset", () => {
      const preset = getOptimizationPreset("development");
      expect(preset.treeShake).toBe(false);
      expect(preset.minify).toBe(false);
      expect(preset.sourceMaps).toBe(true);
    });

    it("should return staging preset", () => {
      const preset = getOptimizationPreset("staging");
      expect(preset.treeShake).toBe(true);
      expect(preset.minify).toBe(true);
      expect(preset.sourceMaps).toBe(true);
    });

    it("should return production preset", () => {
      const preset = getOptimizationPreset("production");
      expect(preset.treeShake).toBe(true);
      expect(preset.minify).toBe(true);
      expect(preset.sourceMaps).toBe(false);
    });
  });

  describe("getDeploymentInstructions", () => {
    it("should return Vercel instructions", () => {
      const instructions = getDeploymentInstructions("vercel");
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some((i) => i.includes("vercel"))).toBe(true);
    });

    it("should return Netlify instructions", () => {
      const instructions = getDeploymentInstructions("netlify");
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some((i) => i.includes("netlify"))).toBe(true);
    });

    it("should return Firebase instructions", () => {
      const instructions = getDeploymentInstructions("firebase");
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some((i) => i.includes("firebase"))).toBe(true);
    });

    it("should return GitHub Pages instructions", () => {
      const instructions = getDeploymentInstructions("github-pages");
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.some((i) => i.includes("gh-pages") || i.includes("GitHub"))).toBe(true);
    });
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe("Module Constants", () => {
  describe("DEPLOYMENT_PLATFORMS", () => {
    it("should define all supported platforms", () => {
      expect(DEPLOYMENT_PLATFORMS.vercel).toBeDefined();
      expect(DEPLOYMENT_PLATFORMS.netlify).toBeDefined();
      expect(DEPLOYMENT_PLATFORMS.firebase).toBeDefined();
      expect(DEPLOYMENT_PLATFORMS["github-pages"]).toBeDefined();
    });

    it("should have platform details", () => {
      expect(DEPLOYMENT_PLATFORMS.vercel.name).toBe("Vercel");
      expect(DEPLOYMENT_PLATFORMS.vercel.configFile).toBe("vercel.json");
      expect(DEPLOYMENT_PLATFORMS.vercel.cli).toBe("vercel");
    });
  });

  describe("CI_PROVIDERS", () => {
    it("should define all supported CI providers", () => {
      expect(CI_PROVIDERS["github-actions"]).toBeDefined();
      expect(CI_PROVIDERS["gitlab-ci"]).toBeDefined();
      expect(CI_PROVIDERS.bitbucket).toBeDefined();
      expect(CI_PROVIDERS["azure-pipelines"]).toBeDefined();
    });
  });

  describe("NETWORK_PRESETS", () => {
    it("should define offline preset", () => {
      expect(NETWORK_PRESETS.offline).toBeDefined();
      expect(NETWORK_PRESETS.offline.download).toBe(0);
      expect(NETWORK_PRESETS.offline.upload).toBe(0);
    });

    it("should define 3G presets", () => {
      expect(NETWORK_PRESETS["slow-3g"]).toBeDefined();
      expect(NETWORK_PRESETS["fast-3g"]).toBeDefined();
    });

    it("should define 4G presets", () => {
      expect(NETWORK_PRESETS["slow-4g"]).toBeDefined();
      expect(NETWORK_PRESETS["fast-4g"]).toBeDefined();
    });
  });

  describe("OPTIMIZATION_PRESETS", () => {
    it("should have presets for all modes", () => {
      expect(OPTIMIZATION_PRESETS.development).toBeDefined();
      expect(OPTIMIZATION_PRESETS.staging).toBeDefined();
      expect(OPTIMIZATION_PRESETS.production).toBeDefined();
    });
  });
});

// ============================================================================
// TOOL DEFINITIONS TESTS
// ============================================================================

describe("Build Tools Definitions", () => {
  it("should define all 11 build tools", () => {
    expect(BUILD_TOOLS.length).toBe(11);
  });

  it("should define project_create tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_create");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("name");
  });

  it("should define project_build tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_build");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("projectId");
  });

  it("should define project_install_dependencies tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_install_dependencies");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("outputPath");
    expect(tool?.inputSchema.properties?.offline).toBeDefined();
    expect(tool?.inputSchema.properties?.upgrade).toBeDefined();
  });

  it("should define project_serve tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_serve");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties?.port).toBeDefined();
    expect(tool?.inputSchema.properties?.host).toBeDefined();
  });

  it("should define project_deploy tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_deploy");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("platform");
  });

  it("should define project_audit tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_audit");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties?.categories).toBeDefined();
  });

  it("should define project_test_offline tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_test_offline");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties?.scenario).toBeDefined();
  });

  it("should define project_configure_cicd tool", () => {
    const tool = BUILD_TOOLS.find((t) => t.name === "project_configure_cicd");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain("provider");
  });
});

// ============================================================================
// TOOL HANDLER TESTS
// ============================================================================

describe("Build Tool Handlers", () => {
  describe("handleProjectCreate", () => {
    it("should create a new project", () => {
      const mockContext = getMockContext();
      const result = handleProjectCreate(
        {
          projectId: "new-project-id",
          name: "new_project",
          displayName: "New Project",
          architecture: "clean",
        },
        {
          ...mockContext,
          getProject: () => undefined, // No existing project
        }
      );

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.name).toBe("new_project");
    });

    it("should reject duplicate project", () => {
      const mockContext = getMockContext();
      const result = handleProjectCreate(
        { projectId: TEST_PROJECT_UUID, name: "test_pwa" },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("handleProjectBuild", () => {
    it("should build a project", () => {
      const mockContext = getMockContext();
      const result = handleProjectBuild(
        { projectId: TEST_PROJECT_UUID, mode: "production" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("production");
      expect(result.command).toContain("flutter build web");
    });

    it("should fail for non-existent project", () => {
      const mockContext = getMockContext();
      const result = handleProjectBuild(
        { projectId: "non-existent" },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("handleProjectServe", () => {
    it("should start dev server", () => {
      const mockContext = getMockContext();
      const result = handleProjectServe(
        { projectId: TEST_PROJECT_UUID, port: 3000 },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.port).toBe(3000);
      expect(result.result?.url).toContain("localhost:3000");
    });

    it("should use default port", () => {
      const mockContext = getMockContext();
      const result = handleProjectServe(
        { projectId: TEST_PROJECT_UUID },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.port).toBe(8080);
    });
  });

  describe("handleProjectDeploy", () => {
    it("should deploy to Vercel", () => {
      const mockContext = getMockContext();
      const result = handleProjectDeploy(
        { projectId: TEST_PROJECT_UUID, platform: "vercel", production: true },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.platform).toBe("vercel");
      expect(result.commands).toContain("vercel --prod");
    });

    it("should deploy to Netlify", () => {
      const mockContext = getMockContext();
      const result = handleProjectDeploy(
        { projectId: TEST_PROJECT_UUID, platform: "netlify" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.platform).toBe("netlify");
    });

    it("should deploy to Firebase", () => {
      const mockContext = getMockContext();
      const result = handleProjectDeploy(
        { projectId: TEST_PROJECT_UUID, platform: "firebase" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.platform).toBe("firebase");
    });

    it("should deploy to GitHub Pages", () => {
      const mockContext = getMockContext();
      const result = handleProjectDeploy(
        { projectId: TEST_PROJECT_UUID, platform: "github-pages" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result?.platform).toBe("github-pages");
    });
  });

  describe("handleConfigureDeployment", () => {
    it("should configure Vercel deployment", () => {
      const mockContext = getMockContext();
      const result = handleConfigureDeployment(
        { projectId: TEST_PROJECT_UUID, platform: "vercel", headers: true },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
    });

    it("should configure Netlify deployment", () => {
      const mockContext = getMockContext();
      const result = handleConfigureDeployment(
        { projectId: TEST_PROJECT_UUID, platform: "netlify", buildCommand: "flutter build web" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.config?.buildCommand).toBe("flutter build web");
    });
  });

  describe("handleProjectValidate", () => {
    it("should validate a valid project", () => {
      const mockContext = getMockContext();
      const result = handleProjectValidate(
        { projectId: TEST_PROJECT_UUID },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
    });

    it("should report issues for invalid project", () => {
      mockProject.pwa.name = "";
      const mockContext = getMockContext();
      const result = handleProjectValidate(
        { projectId: TEST_PROJECT_UUID },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("handleProjectExport", () => {
    it("should export as zip", () => {
      const mockContext = getMockContext();
      const result = handleProjectExport(
        { projectId: TEST_PROJECT_UUID, format: "zip" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.exportPath).toContain(".zip");
    });

    it("should export as tar", () => {
      const mockContext = getMockContext();
      const result = handleProjectExport(
        { projectId: TEST_PROJECT_UUID, format: "tar" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.exportPath).toContain(".tar.gz");
    });

    it("should export as directory", () => {
      const mockContext = getMockContext();
      const result = handleProjectExport(
        { projectId: TEST_PROJECT_UUID, format: "directory" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.exportPath).not.toContain(".zip");
      expect(result.exportPath).not.toContain(".tar");
    });
  });

  describe("handleTestOffline", () => {
    it("should create offline test plan", () => {
      const mockContext = getMockContext();
      const result = handleTestOffline(
        { projectId: TEST_PROJECT_UUID, scenario: "offline" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.testPlan).toBeDefined();
      expect(result.testPlan?.scenario).toBe("offline");
    });

    it("should create slow-3g test plan", () => {
      const mockContext = getMockContext();
      const result = handleTestOffline(
        { projectId: TEST_PROJECT_UUID, scenario: "slow-3g" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect((result.testPlan as { networkConditions: { latency: number } })?.networkConditions.latency).toBe(2000);
    });
  });

  describe("handleProjectAudit", () => {
    it("should run Lighthouse audit", () => {
      const mockContext = getMockContext();
      const result = handleProjectAudit(
        { projectId: TEST_PROJECT_UUID, categories: ["performance", "pwa"] },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result?.scores).toBeDefined();
      expect(result.command).toContain("lighthouse");
    });

    it("should include PWA score", () => {
      const mockContext = getMockContext();
      const result = handleProjectAudit(
        { projectId: TEST_PROJECT_UUID },
        mockContext
      );

      expect(result.result?.scores.pwa).toBeDefined();
    });
  });

  describe("handleConfigureCICD", () => {
    it("should configure GitHub Actions", () => {
      const mockContext = getMockContext();
      const result = handleConfigureCICD(
        { projectId: TEST_PROJECT_UUID, provider: "github-actions", branches: ["main"] },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.config?.provider).toBe("github-actions");
    });

    it("should configure GitLab CI", () => {
      const mockContext = getMockContext();
      const result = handleConfigureCICD(
        { projectId: TEST_PROJECT_UUID, provider: "gitlab-ci" },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.config?.provider).toBe("gitlab-ci");
    });

    it("should add deploy stage when autoDeploy is true", () => {
      const mockContext = getMockContext();
      const result = handleConfigureCICD(
        {
          projectId: TEST_PROJECT_UUID,
          provider: "github-actions",
          autoDeploy: true,
          deployTarget: "vercel",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      const stages = result.config?.stages as Array<{ name: string }>;
      expect(stages?.some((s) => s.name === "deploy")).toBe(true);
    });
  });

  describe("handleBuildTool (dispatcher)", () => {
    it("should dispatch to correct handler", () => {
      const mockContext = getMockContext();

      const serveResult = handleBuildTool("project_serve", { projectId: TEST_PROJECT_UUID }, mockContext);
      expect(serveResult.success).toBe(true);

      const auditResult = handleBuildTool("project_audit", { projectId: TEST_PROJECT_UUID }, mockContext);
      expect(auditResult.success).toBe(true);
    });

    it("should return error for unknown tool", () => {
      const mockContext = getMockContext();
      const result = handleBuildTool("unknown_tool", {}, mockContext);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });
});

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

describe("Build Templates", () => {
  it("should define vercel config template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "vercel_config");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("vercel");
    expect(template?.output.extension).toBe(".json");
  });

  it("should define netlify config template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "netlify_config");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("netlify");
    expect(template?.output.extension).toBe(".toml");
  });

  it("should define firebase config template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "firebase_config");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("firebase");
    expect(template?.output.extension).toBe(".json");
  });

  it("should define github actions workflow template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "github_actions_workflow");
    expect(template).toBeDefined();
    expect(template?.output.path).toContain(".github/workflows");
    expect(template?.output.extension).toBe(".yml");
  });

  it("should define gitlab ci template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "gitlab_ci_config");
    expect(template).toBeDefined();
    expect(template?.output.extension).toBe(".yml");
  });

  it("should define environment dart template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "environment_dart");
    expect(template).toBeDefined();
    expect(template?.output.extension).toBe(".dart");
    expect(template?.output.path).toContain("lib/core/config");
  });

  it("should define build script template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "build_script");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("build");
    expect(template?.output.extension).toBe(".sh");
  });

  it("should define dev server script template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "dev_server_script");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("dev");
    expect(template?.output.extension).toBe(".sh");
  });

  it("should define dockerfile template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "dockerfile");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("Dockerfile");
  });

  it("should define nginx config template", () => {
    const template = BUILD_TEMPLATES.find((t) => t.id === "nginx_config");
    expect(template).toBeDefined();
    expect(template?.output.filename).toBe("nginx");
    expect(template?.output.extension).toBe(".conf");
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Build Module Hooks", () => {
  it("should have onInstall hook", () => {
    expect(buildHooks.onInstall).toBeDefined();
    expect(typeof buildHooks.onInstall).toBe("function");
  });

  it("should have beforeGenerate hook", () => {
    expect(buildHooks.beforeGenerate).toBeDefined();
    expect(typeof buildHooks.beforeGenerate).toBe("function");
  });

  it("should have onGenerate hook", () => {
    expect(buildHooks.onGenerate).toBeDefined();
    expect(typeof buildHooks.onGenerate).toBe("function");
  });

  it("should have afterGenerate hook", () => {
    expect(buildHooks.afterGenerate).toBeDefined();
    expect(typeof buildHooks.afterGenerate).toBe("function");
  });

  it("should have beforeBuild hook", () => {
    expect(buildHooks.beforeBuild).toBeDefined();
    expect(typeof buildHooks.beforeBuild).toBe("function");
  });

  it("should have afterBuild hook", () => {
    expect(buildHooks.afterBuild).toBeDefined();
    expect(typeof buildHooks.afterBuild).toBe("function");
  });

  it("should have onUninstall hook", () => {
    expect(buildHooks.onUninstall).toBeDefined();
    expect(typeof buildHooks.onUninstall).toBe("function");
  });
});

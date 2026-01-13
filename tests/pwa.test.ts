/**
 * PWA Module Tests
 */

import {
  PWAModuleConfig,
  DEFAULT_PWA_CONFIG,
  PWAConfigSchema,
  generateIconConfigs,
  generateManifestContent,
  isValidHexColor,
  normalizeHexColor,
  STANDARD_ICON_SIZES,
  MASKABLE_ICON_SIZES,
} from "../src/modules/pwa/config.js";
import {
  PWA_MODULE,
  getPWAMetaTags,
  getServiceWorkerScript,
  generatePWADeployConfig,
  PWA_LIGHTHOUSE_TIPS,
} from "../src/modules/pwa/index.js";
import { pwaHooks } from "../src/modules/pwa/hooks.js";
import { PWA_TOOLS, handlePWATool } from "../src/modules/pwa/tools.js";
import { PWA_TEMPLATES } from "../src/modules/pwa/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

describe("PWA Config", () => {
  describe("Hex Color Validation", () => {
    test("should validate valid hex colors", () => {
      expect(isValidHexColor("#2196F3")).toBe(true);
      expect(isValidHexColor("#fff")).toBe(true);
      expect(isValidHexColor("#FFFFFF")).toBe(true);
      expect(isValidHexColor("#000")).toBe(true);
    });

    test("should reject invalid hex colors", () => {
      expect(isValidHexColor("2196F3")).toBe(false);
      expect(isValidHexColor("#GGG")).toBe(false);
      expect(isValidHexColor("red")).toBe(false);
      expect(isValidHexColor("#12345")).toBe(false);
    });
  });

  describe("Hex Color Normalization", () => {
    test("should add # prefix if missing", () => {
      expect(normalizeHexColor("2196F3")).toBe("#2196F3");
      expect(normalizeHexColor("fff")).toBe("#fff");
    });

    test("should keep # prefix if present", () => {
      expect(normalizeHexColor("#2196F3")).toBe("#2196F3");
      expect(normalizeHexColor("#fff")).toBe("#fff");
    });
  });

  describe("Icon Config Generation", () => {
    test("should generate standard icons", () => {
      const icons = generateIconConfigs("/icons", false);

      expect(icons.length).toBe(STANDARD_ICON_SIZES.length);
      expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
      expect(icons.some((i) => i.sizes === "512x512")).toBe(true);
    });

    test("should include maskable icons when enabled", () => {
      const icons = generateIconConfigs("/icons", true);

      const maskableCount = icons.filter((i) => i.purpose === "maskable").length;
      expect(maskableCount).toBe(MASKABLE_ICON_SIZES.length);
    });

    test("should use custom path", () => {
      const icons = generateIconConfigs("/custom/path", false);

      expect(icons[0].src).toContain("/custom/path/");
    });
  });

  describe("Manifest Generation", () => {
    test("should generate valid manifest JSON", () => {
      const manifest = generateManifestContent(DEFAULT_PWA_CONFIG);
      const parsed = JSON.parse(manifest);

      expect(parsed.name).toBe(DEFAULT_PWA_CONFIG.name);
      expect(parsed.short_name).toBe(DEFAULT_PWA_CONFIG.shortName);
      expect(parsed.theme_color).toBe(DEFAULT_PWA_CONFIG.themeColor);
      expect(parsed.background_color).toBe(DEFAULT_PWA_CONFIG.backgroundColor);
      expect(parsed.display).toBe(DEFAULT_PWA_CONFIG.display);
    });

    test("should include icons in manifest", () => {
      const config: PWAModuleConfig = {
        ...DEFAULT_PWA_CONFIG,
        icons: [
          { src: "/icon.png", sizes: "192x192", type: "image/png" },
        ],
      };

      const manifest = generateManifestContent(config);
      const parsed = JSON.parse(manifest);

      expect(parsed.icons.length).toBe(1);
      expect(parsed.icons[0].src).toBe("/icon.png");
    });
  });

  describe("Default Config", () => {
    test("should have valid default values", () => {
      expect(DEFAULT_PWA_CONFIG.name).toBe("My PWA App");
      expect(DEFAULT_PWA_CONFIG.shortName).toBe("MyPWA");
      expect(DEFAULT_PWA_CONFIG.display).toBe("standalone");
      expect(DEFAULT_PWA_CONFIG.orientation).toBe("any");
      expect(DEFAULT_PWA_CONFIG.startUrl).toBe("/");
      expect(DEFAULT_PWA_CONFIG.scope).toBe("/");
      expect(DEFAULT_PWA_CONFIG.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(DEFAULT_PWA_CONFIG.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test("should have service worker config", () => {
      expect(DEFAULT_PWA_CONFIG.serviceWorker.enabled).toBe(true);
      expect(DEFAULT_PWA_CONFIG.serviceWorker.precacheAssets).toBe(true);
      expect(DEFAULT_PWA_CONFIG.serviceWorker.skipWaiting).toBe(true);
      expect(DEFAULT_PWA_CONFIG.serviceWorker.clientsClaim).toBe(true);
    });

    test("should have install prompt config", () => {
      expect(DEFAULT_PWA_CONFIG.installPrompt.enabled).toBe(true);
      expect(DEFAULT_PWA_CONFIG.installPrompt.delay).toBeGreaterThan(0);
      expect(DEFAULT_PWA_CONFIG.installPrompt.showOnVisit).toBeGreaterThan(0);
    });

    test("should have offline indicator config", () => {
      expect(DEFAULT_PWA_CONFIG.offlineIndicator.enabled).toBe(true);
      expect(DEFAULT_PWA_CONFIG.offlineIndicator.position).toBe("bottom");
    });
  });

  describe("Schema Validation", () => {
    test("should validate valid config", () => {
      const result = PWAConfigSchema.safeParse(DEFAULT_PWA_CONFIG);
      expect(result.success).toBe(true);
    });

    test("should reject invalid theme color", () => {
      const config = {
        ...DEFAULT_PWA_CONFIG,
        themeColor: "invalid",
      };
      const result = PWAConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test("should reject name exceeding max length", () => {
      const config = {
        ...DEFAULT_PWA_CONFIG,
        name: "A".repeat(50),
      };
      const result = PWAConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("PWA Module", () => {
  test("should have correct module metadata", () => {
    expect(PWA_MODULE.id).toBe("pwa");
    expect(PWA_MODULE.name).toBe("Progressive Web App");
    expect(PWA_MODULE.compatibleTargets).toContain("web");
    expect(PWA_MODULE.compatibleTargets).not.toContain("android");
  });

  test("should have templates", () => {
    expect(PWA_TEMPLATES.length).toBeGreaterThan(0);
    expect(PWA_TEMPLATES.some((t) => t.id === "pwa-manifest")).toBe(true);
    expect(PWA_TEMPLATES.some((t) => t.id === "pwa-service-worker")).toBe(true);
    expect(PWA_TEMPLATES.some((t) => t.id === "pwa-install-prompt")).toBe(true);
    expect(PWA_TEMPLATES.some((t) => t.id === "pwa-offline-indicator")).toBe(true);
  });

  test("should have assets", () => {
    expect(PWA_MODULE.assets.length).toBe(3);
    expect(PWA_MODULE.assets.some((a) => a.dest === "web/manifest.json")).toBe(true);
    expect(PWA_MODULE.assets.some((a) => a.dest === "web/flutter_service_worker.js")).toBe(true);
  });

  test("should have hooks", () => {
    expect(PWA_MODULE.hooks.onInstall).toBeDefined();
    expect(PWA_MODULE.hooks.beforeGenerate).toBeDefined();
    expect(PWA_MODULE.hooks.onGenerate).toBeDefined();
    expect(PWA_MODULE.hooks.afterGenerate).toBeDefined();
    expect(PWA_MODULE.hooks.beforeBuild).toBeDefined();
    expect(PWA_MODULE.hooks.afterBuild).toBeDefined();
  });
});

describe("PWA Helper Functions", () => {
  test("getPWAMetaTags should include theme color", () => {
    const metaTags = getPWAMetaTags(DEFAULT_PWA_CONFIG);

    expect(metaTags).toContain("theme-color");
    expect(metaTags).toContain(DEFAULT_PWA_CONFIG.themeColor);
    expect(metaTags).toContain("manifest");
    expect(metaTags).toContain("apple-mobile-web-app");
  });

  test("getServiceWorkerScript should include registration", () => {
    const script = getServiceWorkerScript();

    expect(script).toContain("serviceWorker");
    expect(script).toContain("register");
    expect(script).toContain("flutter_service_worker.js");
  });

  test("generatePWADeployConfig should generate Vercel config", () => {
    const config = generatePWADeployConfig("vercel");

    expect(config).toContain("headers");
    expect(config).toContain("X-Content-Type-Options");
    expect(config).toContain("flutter_service_worker.js");
  });

  test("generatePWADeployConfig should generate Netlify config", () => {
    const config = generatePWADeployConfig("netlify");

    expect(config).toContain("[[headers]]");
    expect(config).toContain("X-Content-Type-Options");
  });

  test("generatePWADeployConfig should generate Firebase config", () => {
    const config = generatePWADeployConfig("firebase");

    expect(config).toContain("hosting");
    expect(config).toContain("rewrites");
  });

  test("should have Lighthouse tips", () => {
    expect(PWA_LIGHTHOUSE_TIPS.length).toBeGreaterThan(5);
    expect(PWA_LIGHTHOUSE_TIPS.some((t) => t.includes("icons"))).toBe(true);
    expect(PWA_LIGHTHOUSE_TIPS.some((t) => t.includes("HTTPS"))).toBe(true);
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("PWA Tools", () => {
  test("should define all tools", () => {
    expect(PWA_TOOLS.length).toBe(6);

    const toolNames = PWA_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("pwa_configure_manifest");
    expect(toolNames).toContain("pwa_generate_icons");
    expect(toolNames).toContain("pwa_configure_caching");
    expect(toolNames).toContain("pwa_add_shortcut");
    expect(toolNames).toContain("pwa_configure_install_prompt");
    expect(toolNames).toContain("pwa_generate_manifest");
  });

  test("pwa_configure_manifest should have correct schema", () => {
    const tool = PWA_TOOLS.find((t) => t.name === "pwa_configure_manifest");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("name");
    expect(tool?.inputSchema.properties).toHaveProperty("themeColor");
    expect(tool?.inputSchema.required).toContain("projectId");
  });

  test("pwa_configure_caching should have strategy enum", () => {
    const tool = PWA_TOOLS.find((t) => t.name === "pwa_configure_caching");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("precacheAssets");
    expect(tool?.inputSchema.properties).toHaveProperty("skipWaiting");
    expect(tool?.inputSchema.properties).toHaveProperty("rules");
  });
});

describe("PWA Tool Handlers", () => {
  let mockProject: ProjectDefinition;

  const getMockContext = () => ({
    getProject: (id: string) => (id === "test-project-id" ? mockProject : undefined),
    updateProject: async (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
      return mockProject;
    },
    getPWAConfig: (projectId: string) => {
      if (projectId !== "test-project-id") return undefined;
      const moduleConfig = mockProject.modules.find((m) => m.id === "pwa");
      return moduleConfig?.config as PWAModuleConfig | undefined;
    },
    updatePWAConfig: (_projectId: string, config: Partial<PWAModuleConfig>) => {
      const moduleConfig = mockProject.modules.find((m) => m.id === "pwa");
      if (moduleConfig) {
        moduleConfig.config = { ...moduleConfig.config, ...config };
      }
    },
  });

  beforeEach(() => {
    mockProject = {
      id: "test-project-id",
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
          id: "pwa",
          enabled: true,
          config: { ...DEFAULT_PWA_CONFIG },
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  test("pwa_configure_manifest should update manifest settings", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_configure_manifest",
      {
        projectId: "test-project-id",
        name: "Updated App",
        shortName: "UpdApp",
        themeColor: "#FF5722",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("PWA manifest configured");

    const config = mockContext.getPWAConfig("test-project-id");
    expect(config?.name).toBe("Updated App");
    expect(config?.shortName).toBe("UpdApp");
    expect(config?.themeColor).toBe("#FF5722");
  });

  test("pwa_generate_icons should create icon configurations", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_generate_icons",
      {
        projectId: "test-project-id",
        outputPath: "/assets/icons",
        includeMaskable: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("PWA icons configured");

    const config = mockContext.getPWAConfig("test-project-id");
    expect(config?.icons.length).toBeGreaterThan(0);
    expect(config?.icons.some((i) => i.purpose === "maskable")).toBe(true);
    expect(config?.icons[0].src).toContain("/assets/icons/");
  });

  test("pwa_configure_caching should update service worker config", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_configure_caching",
      {
        projectId: "test-project-id",
        precacheAssets: false,
        skipWaiting: false,
        rules: [
          { pattern: "/api/", strategy: "network-first", maxAgeSeconds: 60 },
        ],
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Service worker caching configured");

    const config = mockContext.getPWAConfig("test-project-id");
    expect(config?.serviceWorker.precacheAssets).toBe(false);
    expect(config?.serviceWorker.skipWaiting).toBe(false);
    expect(config?.serviceWorker.runtimeCaching?.length).toBe(1);
  });

  test("pwa_add_shortcut should add a shortcut", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_add_shortcut",
      {
        projectId: "test-project-id",
        name: "New Task",
        url: "/new-task",
        description: "Create a new task",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Shortcut added: New Task");

    const config = mockContext.getPWAConfig("test-project-id");
    expect(config?.shortcuts.length).toBe(1);
    expect(config?.shortcuts[0].name).toBe("New Task");
    expect(config?.shortcuts[0].url).toBe("/new-task");
  });

  test("pwa_add_shortcut should reject duplicate URLs", async () => {
    const mockContext = getMockContext();

    // Add first shortcut
    await handlePWATool(
      "pwa_add_shortcut",
      {
        projectId: "test-project-id",
        name: "Home",
        url: "/home",
      },
      mockContext
    );

    // Try to add duplicate
    await expect(
      handlePWATool(
        "pwa_add_shortcut",
        {
          projectId: "test-project-id",
          name: "Another Home",
          url: "/home",
        },
        mockContext
      )
    ).rejects.toThrow(/already exists/);
  });

  test("pwa_configure_install_prompt should update prompt settings", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_configure_install_prompt",
      {
        projectId: "test-project-id",
        enabled: true,
        delay: 5000,
        promptTitle: "Install Our App",
        promptMessage: "Get the best experience!",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Install prompt configured");

    const config = mockContext.getPWAConfig("test-project-id");
    expect(config?.installPrompt.delay).toBe(5000);
    expect(config?.installPrompt.promptTitle).toBe("Install Our App");
    expect(config?.installPrompt.promptMessage).toBe("Get the best experience!");
  });

  test("pwa_generate_manifest should return manifest JSON", async () => {
    const mockContext = getMockContext();
    const result = await handlePWATool(
      "pwa_generate_manifest",
      {
        projectId: "test-project-id",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Generated manifest.json");
    expect(result.content[0].text).toContain("name");
    expect(result.content[0].text).toContain("short_name");
  });

  test("should throw error for non-existent project", async () => {
    const mockContext = getMockContext();
    await expect(
      handlePWATool(
        "pwa_configure_manifest",
        {
          projectId: "non-existent-id",
          name: "Test",
        },
        mockContext
      )
    ).rejects.toThrow(/not found/);
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("PWA Hooks", () => {
  test("should have all required hooks", () => {
    expect(pwaHooks.onInstall).toBeDefined();
    expect(pwaHooks.beforeGenerate).toBeDefined();
    expect(pwaHooks.onGenerate).toBeDefined();
    expect(pwaHooks.afterGenerate).toBeDefined();
    expect(pwaHooks.beforeBuild).toBeDefined();
    expect(pwaHooks.afterBuild).toBeDefined();
  });
});
